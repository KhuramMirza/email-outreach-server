const express = require('express');
const {
  createLeadHandler,
  scrapeLeadsHandler,
  getLeadsHandler,
  getLeadStatsHandler,
  trackEmailOpenHandler,
} = require('./lead.controller');
const { createLeadSchema, scrapeLeadsSchema } = require('./lead.schema');
const validateRequest = require('../../shared/middlewares/validateRequest');

const router = express.Router();

router.get('/', getLeadsHandler);
router.get('/stats', getLeadStatsHandler);
router.get('/:id/track', trackEmailOpenHandler);
router.post('/', validateRequest(createLeadSchema), createLeadHandler);
router.post('/scrape', validateRequest(scrapeLeadsSchema), scrapeLeadsHandler);

module.exports = router;



