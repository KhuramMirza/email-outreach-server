const express = require('express');
const { createLeadHandler, scrapeLeadsHandler } = require('./lead.controller');
const { createLeadSchema, scrapeLeadsSchema } = require('./lead.schema');
const validateRequest = require('../../shared/middlewares/validateRequest');

const router = express.Router();

router.post('/', validateRequest(createLeadSchema), createLeadHandler);
router.post('/scrape', validateRequest(scrapeLeadsSchema), scrapeLeadsHandler);

module.exports = router;
