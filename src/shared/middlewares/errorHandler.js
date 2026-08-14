const { ZodError } = require('zod');

/**
 * Global Error Handler Middleware
 */
const errorHandler = (err, req, res, next) => {
  console.error(`[Error] ${err.stack || err.message}`);

  // Handle Invalid JSON Body Syntax Error
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      status: 'fail',
      message: 'Invalid JSON payload. Please ensure valid JSON formatting.',
    });
  }

  // Handle Zod Validation Errors
  if (err instanceof ZodError || (err && (Array.isArray(err.errors) || Array.isArray(err.issues)))) {
    const issues = err.errors || err.issues || [];
    const formattedErrors = issues.map((e) => ({
      field: Array.isArray(e.path) ? e.path.join('.') : String(e.path || ''),
      message: e.message,
    }));

    return res.status(400).json({
      status: 'fail',
      message: 'Validation failed',
      errors: formattedErrors,
    });
  }

  // Handle Mongoose ValidationError
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.message,
    }));

    return res.status(400).json({
      status: 'fail',
      message: 'Mongoose Validation Error',
      errors,
    });
  }

  // Handle Mongoose CastError (e.g. invalid ObjectId)
  if (err.name === 'CastError') {
    return res.status(400).json({
      status: 'fail',
      message: `Invalid ${err.path}: ${err.value}`,
    });
  }

  const statusCode = err.statusCode || (res.statusCode === 200 ? 500 : res.statusCode);

  return res.status(statusCode).json({
    status: 'error',
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

module.exports = errorHandler;
