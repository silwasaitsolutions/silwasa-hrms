import { ApiError } from '../utils/ApiError.js';

// Generic Zod validation middleware.
// Usage: validate(schema, 'body' | 'query' | 'params')
export const validate = (schema, source = 'body') => (req, res, next) => {
  const result = schema.safeParse(req[source]);
  if (!result.success) {
    const details = result.error.flatten();
    throw new ApiError(422, 'Validation failed', details);
  }
  req[source] = result.data;
  next();
};
