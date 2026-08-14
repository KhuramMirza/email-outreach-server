const { z } = require('zod');

const createSenderSchema = z.object({
  name: z.string().min(1, 'Sender name is required'),
  email: z.string().email('Invalid sender email address'),
  smtpHost: z.string().min(1, 'SMTP host is required'),
  smtpPort: z.number().int().positive().optional(),
  dailyLimit: z.number().int().positive().optional(),
});

module.exports = {
  createSenderSchema,
};
