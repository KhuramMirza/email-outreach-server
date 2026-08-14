const express = require('express');
const { getCampaigns, createCampaign } = require('./campaign.controller');
const validateRequest = require('../../shared/middlewares/validateRequest');
const { createCampaignSchema } = require('./campaign.validation');

const router = express.Router();

router.get('/', getCampaigns);
router.post('/', validateRequest({ body: createCampaignSchema }), createCampaign);

module.exports = router;
