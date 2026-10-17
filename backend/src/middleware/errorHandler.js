import { ApiError } from '../utils/ApiError.js';

export function notFoundHandler(req, res, next) {
  next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`));
}

// Central error handler. All thrown ApiErrors (and unexpected errors)
// end up here and are returned as a consistent JSON shape.
export function errorHandler(err, req, res, next) {
  let statusCode = err instanceof ApiError ? err.statusCode : 500;
  let message = err.message || 'Internal server error';

  if (err.name === 'MulterError') {
    statusCode = err.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
    message = err.code === 'LIMIT_FILE_SIZE'
      ? `File is too large (max ${process.env.MAX_UPLOAD_MB || 10} MB)`
      : err.code === 'LIMIT_FILE_COUNT' ? 'Too many files in one upload (max 10)' : err.message;
  }

  if (statusCode === 500) {
    console.error(err);
  }

  res.status(statusCode).json({
    success: false,
    message,
    details: err.details || undefined,
  });
}
