const mongoose = require('mongoose');

const leadSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      trim: true,
      lowercase: true,
    },
    website: {
      type: String,
      trim: true,
    },
    companyName: {
      type: String,
      trim: true,
    },
    niche: {
      type: String,
      trim: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['Uncontacted', 'Queued', 'Sent', 'Bounced', 'Opened', 'Replied'],
      default: 'Uncontacted',
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Lead', leadSchema);
