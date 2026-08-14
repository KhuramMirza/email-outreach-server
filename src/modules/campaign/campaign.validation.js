const { z } = require('zod');

const createCampaignSchema = z.object({
  name: z.string().min(1, 'Campaign name is required'),
  status: z.enum(['draft', 'scheduled', 'running', 'paused', 'completed']).optional(),
  templateId: z.string().optional(),
  senderId: z.string().optional(),
  leads: z.array(z.string()).optional(),
});

module.exports = {
  createCampaignSchema,
};
