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
    const { query } = req.body;
    const result = await leadService.scrapeLeads(query);
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

module.exports = {
  createLeadHandler,
  scrapeLeadsHandler,
};
