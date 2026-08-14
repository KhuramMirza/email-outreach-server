const mongoose = require('mongoose');

const campaignSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ['draft', 'scheduled', 'running', 'paused', 'completed'],
      default: 'draft',
    },
    templateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Template',
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Sender',
    },
    leads: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Lead',
      },
    ],
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Campaign', campaignSchema);
