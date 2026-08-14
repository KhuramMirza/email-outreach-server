const axios = require('axios');
const cheerio = require('cheerio');
const Lead = require('./lead.model');
const emailQueue = require('../../config/queue/emailQueue');

/**
 * Save a new lead to the database
 * @param {Object} leadData
 * @returns {Promise<Object>} Created lead document
 */
const createLead = async (leadData) => {
  const lead = new Lead(leadData);
  return await lead.save();
};

/**
 * Filter out generic social networks, video platforms, and massive directory domains
 * @param {string} url
 * @returns {boolean} True if the URL is a valid target website, false if generic
 */
const isTargetWebsite = (url) => {
  const genericDomains = [
    'facebook.com',
    'linkedin.com',
    'twitter.com',
    'x.com',
    'instagram.com',
    'youtube.com',
    'pinterest.com',
    'yelp.com',
    'wikipedia.org',
    'amazon.com',
    'reddit.com',
    'glassdoor.com',
  ];

  try {
    const hostname = new URL(url).hostname.toLowerCase();
    return !genericDomains.some((domain) => hostname.includes(domain));
  } catch (e) {
    return false;
  }
};

/**
 * Scrape leads by search query using Serper API (Google Search)
 * @param {string} query - Search term / niche
 * @returns {Promise<Object>} Scraping summary & created leads
 */
const scrapeLeads = async (query, subject, body) => {
  console.log(`[Serper Scraper] Initiating Google search via Serper API for query: "${query}"...`);

  const targetUrls = [];
  const foundEmailMap = new Map(); // Map email -> targetUrl
  const createdLeads = [];
  const errors = [];

  // Step 1: Query Serper API (Google Search)
  try {
    const apiKey = process.env.SERPER_API_KEY;
    if (!apiKey) {
      throw new Error('SERPER_API_KEY environment variable is not defined.');
    }

    const serperResponse = await axios.post(
      'https://google.serper.dev/search',
      { q: query },
      {
        headers: {
          'X-API-KEY': apiKey,
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      }
    );

    const organicResults = serperResponse.data.organic || [];
    console.log(`[Serper Scraper] Received ${organicResults.length} organic search results from Serper.`);

    // Step 2: Extract link properties and filter out generic/social domains
    organicResults.forEach((result) => {
      if (result.link && isTargetWebsite(result.link)) {
        targetUrls.push(result.link);
      }
    });

    console.log(`[Serper Scraper] Extracted ${targetUrls.length} targeted websites after filtering.`);
  } catch (err) {
    const errMsg = `Serper API Search Failed: ${err.response ? JSON.stringify(err.response.data) : err.message}`;
    console.error(`[Serper Scraper Error] ${errMsg}`);
    errors.push(errMsg);
  }

  // Regex to extract valid email addresses excluding common image/asset extensions
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.(?!png|jpg|jpeg|gif|svg|webp|bmp|css|js|ico)[a-zA-Z]{2,}/gi;

  // Step 3: Fetch HTML via Axios & Parse via Cheerio for each target URL
  for (const url of targetUrls) {
    try {
      console.log(`[Serper Scraper] Crawling target website: ${url}`);
      const response = await axios.get(url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
        timeout: 8000,
      });

      const $ = cheerio.load(response.data);
      const pageText = $('body').text() + ' ' + response.data;
      const matches = pageText.match(emailRegex);

      if (matches) {
        matches.forEach((email) => {
          const cleanEmail = email.toLowerCase().trim();
          if (!/\.(png|jpg|jpeg|gif|svg|webp|bmp|css|js|ico)$/i.test(cleanEmail)) {
            if (!foundEmailMap.has(cleanEmail)) {
              foundEmailMap.set(cleanEmail, url);
            }
          }
        });
      }
    } catch (err) {
      console.error(`[Serper Scraper Error] Failed to crawl ${url}: ${err.message}`);
      errors.push(`Failed URL ${url}: ${err.message}`);
    }
  }

  // Step 4: Save unique emails to MongoDB via createLead and dispatch to BullMQ emailQueue
  for (const [email, websiteUrl] of foundEmailMap.entries()) {
    console.log(`[Serper Scraper] Unique email discovered: ${email}`);
    try {
      let lead = await Lead.findOne({ email });

      if (!lead) {
        // Save new lead to MongoDB via createLead
        lead = await createLead({
          email,
          website: websiteUrl,
          niche: query || 'General',
          status: 'Uncontacted',
        });
        console.log(`[Serper Scraper] Saved new lead to MongoDB with ID: ${lead._id}`);
      } else {
        console.log(`[Serper Scraper] Lead ${email} already exists in DB (ID: ${lead._id}). Dispatching email job...`);
      }

      // Dispatch job to BullMQ emailQueue
      const job = await emailQueue.add('send-email', {
        leadId: lead._id,
        subject: subject,
        body: body,
        templateSubject: subject,
        templateBody: body || `Hello, this is an automated outreach message for ${lead.email}`,
      });
      console.log(`[Serper Queue] Enqueued send-email job ${job.id} for lead ${lead._id}`);

      createdLeads.push({ lead, jobId: job.id });
    } catch (err) {
      console.error(`[Serper Scraper Error] Failed saving/queuing lead for ${email}: ${err.message}`);
      errors.push(`Lead ${email}: ${err.message}`);
    }
  }

  return {
    query,
    totalSearchPages: targetUrls.length,
    uniqueEmailsFound: foundEmailMap.size,
    processedLeadsCount: createdLeads.length,
    leads: createdLeads,
    errors,
  };
};

const getLeads = async () => {
  return await Lead.find().sort({ updatedAt: -1, createdAt: -1 });
};


/**
 * Calculate lead statistics and status breakdown using MongoDB aggregation
 * @returns {Promise<Object>} Object with totalLeads, statusBreakdown, and byStatus array
 */
const getLeadStats = async () => {
  const totalLeads = await Lead.countDocuments();

  const statusAgg = await Lead.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
      },
    },
  ]);

  const defaultStatuses = ['Uncontacted', 'Queued', 'Sent', 'Bounced', 'Opened', 'Replied'];
  const statusBreakdown = {};
  defaultStatuses.forEach((status) => {
    statusBreakdown[status] = 0;
  });

  statusAgg.forEach((item) => {
    if (item._id) {
      statusBreakdown[item._id] = item.count;
    }
  });

  const byStatus = Object.keys(statusBreakdown).map((status) => ({
    status,
    count: statusBreakdown[status],
  }));

  return {
    totalLeads,
    statusBreakdown,
    byStatus,
  };
};

/**
 * Record an email open event for a lead by updating status to 'Opened'
 * @param {string} leadId
 * @returns {Promise<Object|null>} Updated lead document
 */
const trackLeadOpen = async (leadId) => {
  try {
    if (leadId) {
      const updatedLead = await Lead.findByIdAndUpdate(leadId, { status: 'Opened' }, { new: true });
      if (updatedLead) {
        console.log(`[Open Tracker] Lead ${leadId} (${updatedLead.email}) status updated to 'Opened'`);
      }
      return updatedLead;
    }
  } catch (err) {
    console.error(`[Open Tracker Error] Failed to update lead ${leadId}:`, err.message);
  }
  return null;
};

/**
 * Create/find a test lead, await saving to MongoDB, then enqueue a test email job in BullMQ
 * @param {string} email
 * @param {string} subject
 * @param {string} body
 * @returns {Promise<Object>} Object with lead document and queued jobId
 */
const sendTestEmail = async (email, subject, body) => {
  const cleanEmail = email.toLowerCase().trim();

  // Atomically upsert the test lead document in MongoDB and touch updatedAt
  const lead = await Lead.findOneAndUpdate(
    { email: cleanEmail },
    {
      $set: {
        email: cleanEmail,
        status: 'Queued',
        niche: 'Manual Test',
        companyName: 'Test Account',
        updatedAt: new Date(),
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  const job = await emailQueue.add('send-email', {
    leadId: lead._id.toString(),
    recipientEmail: cleanEmail,
    subject: subject,
    body: body,
    templateSubject: subject,
    templateBody: body,
  });

  console.log(`[Manual Test] Saved/updated lead ${lead._id} in MongoDB and enqueued test email job ${job.id} for ${cleanEmail}`);

  return {
    lead,
    jobId: job.id,
  };
};



module.exports = {
  createLead,
  scrapeLeads,
  getLeads,
  getLeadStats,
  trackLeadOpen,
  sendTestEmail,
};





