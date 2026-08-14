const express = require('express');
const { getSenders, createSender } = require('./sender.controller');
const validateRequest = require('../../shared/middlewares/validateRequest');
const { createSenderSchema } = require('./sender.validation');

const router = express.Router();

router.get('/', getSenders);
router.post('/', validateRequest({ body: createSenderSchema }), createSender);

module.exports = router;
