import rateLimit from 'express-rate-limit';

// General API limiter
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
});

// Stricter limiter for auth endpoints to slow brute-force attempts
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many attempts, please try again later.' },
});

// Limits GPS check-in/out attempts per logged-in user. Rejected attempts reveal a distance,
// so without a cap someone could probe positions to work out where the office is.
export const punchLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `user-${req.user.id}`,
  message: { success: false, message: 'Too many check-in attempts. Please wait a few minutes and try again.' },
});
