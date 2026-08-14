const { z } = require('zod');

const createLeadSchema = z.object({
  email: z.string().email('Invalid email address'),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  company: z.string().optional(),
  status: z.enum(['active', 'unsubscribed', 'bounced']).optional(),
});

module.exports = {
  createLeadSchema,
};
