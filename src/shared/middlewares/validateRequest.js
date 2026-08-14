const { ZodError } = require('zod');

/**
 * Express middleware to validate request body, query, and params against Zod schemas.
 * Accepts either:
 * - A Zod schema for req.body directly
 * - An object containing individual Zod schemas { body, query, params }
 * - A Zod schema validating { body, query, params }
 */
const validateRequest = (schema) => async (req, res, next) => {
  try {
    if (schema && typeof schema.parseAsync === 'function') {
      if (schema.shape && (schema.shape.body || schema.shape.query || schema.shape.params)) {
        const parsed = await schema.parseAsync({
          body: req.body,
          query: req.query,
          params: req.params,
        });
        if (parsed.body !== undefined) req.body = parsed.body;
        if (parsed.query !== undefined) req.query = parsed.query;
        if (parsed.params !== undefined) req.params = parsed.params;
      } else {
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
