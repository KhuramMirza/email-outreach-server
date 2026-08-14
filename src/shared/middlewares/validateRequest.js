const { ZodError } = require('zod');

/**
 * Express middleware to validate request body, query, and params against Zod schemas.
 * Supports:
 * - Direct Zod schema for req.body (e.g., z.object({ query: z.string(), subject: z.string(), body: z.string() }))
 * - Object with target schemas e.g., { body: zSchema, query: zSchema, params: zSchema }
 * - Top-level wrapper Zod schema e.g., z.object({ body: zSchema, query: zSchema })
 */
const validateRequest = (schema) => async (req, res, next) => {
  try {
    if (!schema) return next();

    if (typeof schema.parseAsync === 'function') {
      // Check if this is a top-level wrapper Zod schema specifically wrapping { body, query, params }
      const shapeKeys = schema.shape ? Object.keys(schema.shape) : [];
      const isWrapperSchema =
        shapeKeys.length > 0 &&
        shapeKeys.every((k) => ['body', 'query', 'params'].includes(k)) &&
        ((schema.shape.body && schema.shape.body._def && schema.shape.body._def.typeName === 'ZodObject') ||
          (schema.shape.query && schema.shape.query._def && schema.shape.query._def.typeName === 'ZodObject') ||
          (schema.shape.params && schema.shape.params._def && schema.shape.params._def.typeName === 'ZodObject'));

      if (isWrapperSchema) {
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
    } else if (typeof schema === 'object') {
      if (schema.body && typeof schema.body.parseAsync === 'function') {
        req.body = await schema.body.parseAsync(req.body);
      }
      if (schema.query && typeof schema.query.parseAsync === 'function') {
        req.query = await schema.query.parseAsync(req.query);
      }
      if (schema.params && typeof schema.params.parseAsync === 'function') {
        req.params = await schema.params.parseAsync(req.params);
      }
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

