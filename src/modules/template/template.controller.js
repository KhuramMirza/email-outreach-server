const Template = require('./template.model');

const getTemplates = async (req, res, next) => {
  try {
    const templates = await Template.find();
    res.status(200).json({ success: true, data: templates });
  } catch (error) {
    next(error);
  }
};

const createTemplate = async (req, res, next) => {
  try {
    const template = await Template.create(req.body);
    res.status(201).json({ success: true, data: template });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getTemplates,
  createTemplate,
};
