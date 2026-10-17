// Wraps an async route/controller function so thrown errors are
// forwarded to Express's error handler instead of crashing the process.
export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);
