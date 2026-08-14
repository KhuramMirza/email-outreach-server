const axios = require('axios');
const cheerio = require('cheerio');
const Lead = require('./lead.model');

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
 * Scrape leads by search query
 * @param {string} query
 * @returns {Promise<{ created: Array, errors: Array }>}
 */
const scrapeLeads = async (query) => {
  const extractedUrls = new Set();
  const foundEmails = new Set();
  const createdLeads = [];
  const errors = [];

  // Step 1: Fetch Google Search Results
  try {
    const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    const { data: searchHtml } = await axios.get(searchUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      timeout: 10000,
    });

    const $search = cheerio.load(searchHtml);
    $search('a.result__url, a.result__snippet').each((_, element) => {
      let href = $search(element).attr('href');
      if (href) {
        // Unpack DuckDuckGo redirect link if present
        if (href.includes('uddg=')) {
          const match = href.match(/uddg=([^&]+)/);
          if (match && match[1]) {
            href = decodeURIComponent(match[1]);
          }
        }
        if (href.startsWith('http://') || href.startsWith('https://')) {
          try {
            const parsedUrl = new URL(href);
            extractedUrls.add(`${parsedUrl.protocol}//${parsedUrl.hostname}`);
          } catch (e) {
            // Ignore invalid URL parse
          }
        }
      }
    });
  } catch (err) {
    errors.push(`Failed to fetch search results for query: ${err.message}`);
  }

  // Regex pattern matching valid emails and excluding image/media file extensions
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.(?!png|jpg|jpeg|gif|svg|webp|bmp|css|js|ico)[a-zA-Z]{2,}/gi;

  // Step 2 & 3: Fetch HTML of target websites & extract emails with Cheerio and Regex
  for (const targetUrl of extractedUrls) {
    try {
      const response = await axios.get(targetUrl, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
        timeout: 7000,
      });

      const $page = cheerio.load(response.data);
      const pageText = $page('body').text() + ' ' + response.data;
      const matches = pageText.match(emailRegex);

      if (matches) {
        matches.forEach((email) => {
          const cleanEmail = email.toLowerCase().trim();
          // Additional check for image/asset extensions
          if (!/\.(png|jpg|jpeg|gif|svg|webp|bmp|css|js|ico)$/i.test(cleanEmail)) {
            foundEmails.add(JSON.stringify({ email: cleanEmail, website: targetUrl }));
          }
        });
      }
    } catch (err) {
      errors.push(`Failed scraping website ${targetUrl}: ${err.message}`);
    }
  }

  // Step 4: Save unique emails to database via createLead
  for (const itemStr of foundEmails) {
    const { email, website } = JSON.parse(itemStr);
    try {
      const existing = await Lead.findOne({ email });
      if (!existing) {
        const lead = await createLead({
          email,
          website,
          niche: query,
          status: 'Uncontacted',
        });
        createdLeads.push(lead);
      }
    } catch (err) {
      errors.push(`Failed saving lead for ${email}: ${err.message}`);
    }
  }

  return {
    totalUrlsScraped: extractedUrls.size,
    totalEmailsFound: foundEmails.size,
    createdLeadsCount: createdLeads.length,
    createdLeads,
    errors,
  };
};

module.exports = {
  createLead,
  scrapeLeads,
};
