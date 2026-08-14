const express = require('express');
const cors = require('cors');

const leadRoutes = require('./modules/lead/lead.routes');
const campaignRoutes = require('./modules/campaign/campaign.routes');
const templateRoutes = require('./modules/template/template.routes');
const senderRoutes = require('./modules/sender/sender.routes');
const { errorHandler } = require('./shared/middlewares');

const app = express();

// Global Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health Check Route
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Email Outreach API is running' });
});

// Modular Feature Routes
app.use('/api/v1/leads', leadRoutes);
app.use('/api/v1/campaigns', campaignRoutes);
app.use('/api/v1/templates', templateRoutes);
app.use('/api/v1/senders', senderRoutes);

// Global Error Handler
app.use(errorHandler);

module.exports = app;
