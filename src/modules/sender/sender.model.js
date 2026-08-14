const mongoose = require('mongoose');

const senderSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    smtpHost: {
      type: String,
      required: true,
    },
    smtpPort: {
      type: Number,
      default: 587,
    },
    dailyLimit: {
      type: Number,
      default: 200,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Sender', senderSchema);
