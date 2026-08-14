const Campaign = require('./campaign.model');

const getCampaigns = async (req, res, next) => {
  try {
    const campaigns = await Campaign.find();
    res.status(200).json({ success: true, data: campaigns });
  } catch (error) {
    next(error);
  }
};

const createCampaign = async (req, res, next) => {
  try {
    const campaign = await Campaign.create(req.body);
    res.status(201).json({ success: true, data: campaign });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCampaigns,
  createCampaign,
};
