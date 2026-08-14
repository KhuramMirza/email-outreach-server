const { ZodError } = require('zod');

/**
 * Express middleware to validate request body, query, and params against Zod schemas.
 * Supports:
 * - Direct Zod schema for req.body (e.g., z.object({ query: z.string() }))
 * - Object with target schemas e.g., { body: zSchema, query: zSchema, params: zSchema }
 * - Top-level wrapper schema e.g., z.object({ body: zSchema, query: zSchema })
 */
const validateRequest = (schema) => async (req, res, next) => {
  try {
    if (schema && typeof schema.parseAsync === 'function') {
      // Check if schema is a top-level wrapper explicitly containing a 'body' Zod shape
      if (schema.shape && schema.shape.body && typeof schema.shape.body.parseAsync === 'function') {
        const parsed = await schema.parseAsync({
          body: req.body,
          query: req.query,
          params: req.params,
        });
        if (parsed.body !== undefined) req.body = parsed.body;
        if (parsed.query !== undefined) req.query = parsed.query;
        if (parsed.params !== undefined) req.params = parsed.params;
      } else {
        // Validate req.body directly against the schema
        req.body = await schema.parseAsync(req.body);
      }
    } else if (schema && typeof schema === 'object') {
      if (schema.body) req.body = await schema.body.parseAsync(req.body);
      if (schema.query) req.query = await schema.query.parseAsync(req.query);
      if (schema.params) req.params = await schema.params.parseAsync(req.params);
    }
    next();
  } catch (error) {
    if (error instanceof ZodError || (error && (Array.isArray(error.errors) || Array.isArray(error.issues)))) {
      const issues = error.errors || error.issues || [];
      const formattedErrors = issues.map((err) => ({
        field: Array.isArray(err.path) ? err.path.join('.') : String(err.path || ''),
        message: err.message,
      }));

      return res.status(400).json({
        status: 'fail',
        message: 'Validation failed',
        errors: formattedErrors,
      });
    }
    next(error);
  }
};

module.exports = validateRequest;
