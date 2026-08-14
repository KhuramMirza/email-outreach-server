const { z } = require('zod');

const createLeadSchema = z.object({
  email: z.string({ required_error: 'Email is required' }).email('Invalid email format'),
  website: z.string().optional(),
  companyName: z.string().optional(),
  niche: z.string().optional(),
  status: z
    .enum(['Uncontacted', 'Queued', 'Sent', 'Bounced', 'Opened', 'Replied'])
    .optional(),
});

const scrapeLeadsSchema = z.object({
  query: z.string({ required_error: 'Query parameter is required' }).min(1, 'Query cannot be empty'),
});

module.exports = {
  createLeadSchema,
  scrapeLeadsSchema,
};
