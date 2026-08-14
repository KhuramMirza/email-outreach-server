const { Worker } = require('bullmq');
const nodemailer = require('nodemailer');
const { SESv2Client, SendEmailCommand } = require('@aws-sdk/client-sesv2');
const redisConnection = require('../../config/queue/redis');
const Lead = require('../lead/lead.model');

// Initialize AWS SES v2 Client
const sesClient = new SESv2Client({
  region: process.env.AWS_REGION || 'us-east-1',
});

// Configure Nodemailer using SES v2 Transport
// Note: Nodemailer SESTransport requires options.SES to contain { sesClient, SendEmailCommand }
const transporter = nodemailer.createTransport({
  SES: {
    sesClient,
    SendEmailCommand,
  },
});

// Verified sender email address in AWS SES console
const VERIFIED_SENDER_EMAIL = process.env.SENDER_EMAIL || 'mirzakhuram101@gmail.com';

/**
 * BullMQ Worker for processing email-queue jobs
 * Rate limiter configured to process a MAXIMUM of 1 job every 60 seconds (60,000 ms).
 */
const emailWorker = new Worker(
  'email-queue',
  async (job) => {
    const { leadId, templateBody, body, subject, recipientEmail } = job.data;
    console.log(`[Worker] Processing job ${job.id} for lead ${leadId}`);

    let lead;
    let targetEmail = recipientEmail;

    // Fetch lead from MongoDB if leadId is provided
    if (leadId) {
      lead = await Lead.findById(leadId);
      if (lead && lead.email) {
        targetEmail = lead.email;
      }
    }

    if (!targetEmail) {
      throw new Error(`Target email address not found for leadId: ${leadId}`);
    }

    let mailSubject = subject || 'Outreach Email';
    let mailContent = body || templateBody || '<p>Outreach Message</p>';

    // Dynamic variable substitution based on lead data
    if (lead) {
      const companyVal = lead.companyName || lead.website || 'there';
      const emailVal = lead.email || targetEmail;
      const nicheVal = lead.niche || 'your industry';
      const websiteVal = lead.website || '';

      mailSubject = mailSubject
        .replace(/\{\{\s*companyName\s*\}\}/gi, companyVal)
        .replace(/\{\{\s*email\s*\}\}/gi, emailVal)
        .replace(/\{\{\s*niche\s*\}\}/gi, nicheVal)
        .replace(/\{\{\s*website\s*\}\}/gi, websiteVal);

      mailContent = mailContent
        .replace(/\{\{\s*companyName\s*\}\}/gi, companyVal)
        .replace(/\{\{\s*email\s*\}\}/gi, emailVal)
        .replace(/\{\{\s*niche\s*\}\}/gi, nicheVal)
        .replace(/\{\{\s*website\s*\}\}/gi, websiteVal);
    }

    // Inject 1x1 Open Tracking Pixel Image
    const targetLeadId = leadId || (lead ? lead._id.toString() : null);
    if (targetLeadId) {
      const apiBaseUrl = process.env.API_URL || 'http://localhost:5000/api';
      const trackingPixelTag = `<img src="${apiBaseUrl}/leads/${targetLeadId}/track" width="1" height="1" style="display:none;" />`;
      mailContent += trackingPixelTag;
    }

    // Prepare email options
    const mailOptions = {
      from: VERIFIED_SENDER_EMAIL,
      to: targetEmail,
      subject: mailSubject,
      html: mailContent,
    };

    let info;
    try {
      console.log(`[Worker] Attempting to send email from ${VERIFIED_SENDER_EMAIL} to ${targetEmail} via AWS SES...`);
      info = await transporter.sendMail(mailOptions);
      console.log(`[Worker SUCCESS] Email sent to ${targetEmail}. MessageId: ${info.messageId}`);
    } catch (awsError) {
      console.error('[AWS SES Error] Failed to send email via Nodemailer/SES:');
      console.error(`  Error Message: ${awsError.message}`);
      console.error(`  Error Code: ${awsError.code || awsError.name || 'UNKNOWN'}`);
      if (awsError.$metadata) {
        console.error(`  HTTP Status Code: ${awsError.$metadata.httpStatusCode}`);
        console.error(`  Request ID: ${awsError.$metadata.requestId}`);
      }
      console.error(`  Full Stack:`, awsError.stack);
      throw awsError; // Re-throw so BullMQ flags the job as failed
    }

    // Update lead status in MongoDB to 'Sent' right after sending
    if (targetLeadId) {
      await Lead.findByIdAndUpdate(targetLeadId, { status: 'Sent' });
      console.log(`[Worker] Updated lead ${targetLeadId} status to 'Sent' in MongoDB`);
    }

    return {
      success: true,
      messageId: info.messageId,
      recipient: targetEmail,
    };
  },
  {
    connection: redisConnection,
    limiter: {
      max: 1,
      duration: 60000, // Rate limit: maximum 1 job per 60 seconds
    },
  }
);

emailWorker.on('completed', (job, result) => {
  console.log(`[Worker] Job ${job.id} completed successfully. Result:`, result);
});

emailWorker.on('failed', (job, err) => {
  console.error(`[Worker Error] Job ${job?.id} failed: ${err.message}`);
});

module.exports = emailWorker;
