const express = require('express');
const { getTemplates, createTemplate } = require('./template.controller');
const validateRequest = require('../../shared/middlewares/validateRequest');
const { createTemplateSchema } = require('./template.validation');

const router = express.Router();

router.get('/', getTemplates);
router.post('/', validateRequest({ body: createTemplateSchema }), createTemplate);

module.exports = router;
