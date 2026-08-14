const express = require('express');
const {
  createLeadHandler,
  scrapeLeadsHandler,
  getLeadsHandler,
  getLeadStatsHandler,
  trackEmailOpenHandler,
  sendTestEmailHandler,
} = require('./lead.controller');
const { createLeadSchema, scrapeLeadsSchema, testEmailSchema } = require('./lead.schema');
const validateRequest = require('../../shared/middlewares/validateRequest');

const router = express.Router();

router.get('/', getLeadsHandler);
router.get('/stats', getLeadStatsHandler);
router.get('/:id/track', trackEmailOpenHandler);
router.post('/', validateRequest(createLeadSchema), createLeadHandler);
router.post('/scrape', validateRequest(scrapeLeadsSchema), scrapeLeadsHandler);
router.post('/test', validateRequest(testEmailSchema), sendTestEmailHandler);

module.exports = router;




