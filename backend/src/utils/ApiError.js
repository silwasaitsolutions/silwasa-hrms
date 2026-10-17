// Standard application error class. Controllers/services throw this,
// and the central error handler middleware converts it to a JSON response.
export class ApiError extends Error {
  constructor(statusCode, message, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
  }
}
