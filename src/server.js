require('dotenv').config();
const connectDB = require('./config/db');
const app = require('./app');

// Import background worker
require('./modules/sender/sender.worker');

const PORT = process.env.PORT || 5000;

// Initialize DB Connection
connectDB();

// Listen on configured PORT
app.listen(PORT, () => {
  console.log(`[Server] Listening on port ${PORT}`);
});

module.exports = app;

