require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');

// Import background worker
require('./modules/sender/sender.worker');

const leadRoutes = require('./modules/lead/lead.route');
const campaignRoutes = require('./modules/campaign/campaign.routes');
const templateRoutes = require('./modules/template/template.routes');
const senderRoutes = require('./modules/sender/sender.routes');
const { errorHandler } = require('./shared/middlewares');

const app = express();
const PORT = process.env.PORT || 5000;

// Express Middlewares: CORS and JSON Parsing
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Initialize DB Connection
connectDB();

// Basic Health Check Route
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'API is healthy',
  });
});

// Register Feature Routes
app.use('/api/leads', leadRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/templates', templateRoutes);
app.use('/api/senders', senderRoutes);

// Global Error Handler Middleware
app.use(errorHandler);

// Listen on configured PORT
app.listen(PORT, () => {
  console.log(`[Server] Listening on port ${PORT}`);
});

module.exports = app;
