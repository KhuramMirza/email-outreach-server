const { z } = require('zod');

const createTemplateSchema = z.object({
  name: z.string().min(1, 'Template name is required'),
  subject: z.string().min(1, 'Subject line is required'),
  body: z.string().min(1, 'Template body is required'),
});

module.exports = {
  createTemplateSchema,
};
