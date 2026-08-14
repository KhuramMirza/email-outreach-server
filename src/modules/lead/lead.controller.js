const leadService = require('./lead.service');
const emailQueue = require('../../config/queue/emailQueue');

/**
 * Express controller handler to create a new lead
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
const createLeadHandler = async (req, res) => {
  try {
    const lead = await leadService.createLead(req.body);

    // Queue email sending job for the newly created lead
    const job = await emailQueue.add('send-email', {
      leadId: lead._id,
      templateBody: 'Hello {{companyName}}, this is a test from my custom engine!',
    });
    console.log(`[Queue] Added send-email job ${job.id} for lead ${lead._id}`);

    return res.status(201).json({
      status: 'success',
      data: lead,
      jobId: job.id,
    });
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to create lead',
    });
  }
};

/**
 * Express controller handler to trigger lead scraping
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
const scrapeLeadsHandler = async (req, res) => {
  try {
    const { query, subject, body } = req.body;
    const result = await leadService.scrapeLeads(query, subject, body);
    return res.status(200).json({
      status: 'success',
      message: `Scraping completed for query: ${query}`,
      data: result,
    });
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to scrape leads',
    });
  }
};

const getLeadsHandler = async (req, res) => {
  try {
    const leads = await leadService.getLeads();
    return res.status(200).json({
      status: 'success',
      data: leads,
    });
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to fetch leads',
    });
  }
};

const getLeadStatsHandler = async (req, res) => {
  try {
    const stats = await leadService.getLeadStats();
    return res.status(200).json({
      status: 'success',
      data: stats,
    });
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to fetch lead stats',
    });
  }
};

/**
 * 1x1 Transparent GIF Tracking Pixel Handler
 * Updates lead status to 'Opened' and returns 1x1 image/gif
 */
const trackEmailOpenHandler = async (req, res) => {
  try {
    const { id } = req.params;
    if (id) {
      await leadService.trackLeadOpen(id);
    }
  } catch (err) {
    console.error('[Tracking Pixel Controller Error]', err.message);
  }

  // 1x1 Transparent GIF Buffer
  const pixelBuffer = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');

  res.setHeader('Content-Type', 'image/gif');
  res.setHeader('Content-Length', pixelBuffer.length);
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  return res.status(200).send(pixelBuffer);
};

/**
 * Controller handler to trigger a manual test email
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
const sendTestEmailHandler = async (req, res) => {
  try {
    const { email, subject, body } = req.body;
    const result = await leadService.sendTestEmail(email, subject, body);

    return res.status(201).json({
      status: 'success',
      message: `Test email queued successfully for ${email}`,
      data: result,
    });
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to queue test email',
    });
  }
};

module.exports = {
  createLeadHandler,
  scrapeLeadsHandler,
  getLeadsHandler,
  getLeadStatsHandler,
  trackEmailOpenHandler,
  sendTestEmailHandler,
};




