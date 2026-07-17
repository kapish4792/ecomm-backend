import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { sendError, ErrorCode } from '../utils/errors.ts';
import { ErrorMessage } from '../utils/errorMessages.ts';

// ─────────────────────────────────────────────────────────────────────────────
// RATE LIMITER MIDDLEWARE
//
// Per-user rate limiting on the order creation endpoint.
// Returns HTTP 429 with RATE_LIMITED error code on breach.
//
// Defaults:
//   - 20 requests per 1 minute window per user
//   - Key: authenticated user ID (falls back to IP via ipKeyGenerator for IPv6 safety)
// ─────────────────────────────────────────────────────────────────────────────

export const orderRateLimiter = rateLimit({
  windowMs: 60 * 1000,        // 1-minute sliding window
  max: 20,                     // Max 20 order requests per window
  standardHeaders: true,       // Send RateLimit-* headers
  legacyHeaders: false,        // Disable X-RateLimit-* legacy headers

  // Key by authenticated user ID; fall back to IPv6-safe IP for unauthenticated
  keyGenerator: (req: any) => {
    if (req.user?.userId) {
      return `user:${req.user.userId}`;
    }
    return ipKeyGenerator(req);
  },

  handler: (req, res) => {
    return sendError(
      res,
      429,
      ErrorCode.RATE_LIMITED,
      ErrorMessage.RATE_LIMITED
    );
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// strictOrderRateLimiter
//
// Tighter limit for payment-sensitive endpoints (retry payment, etc.)
// 5 requests per minute per user
// ─────────────────────────────────────────────────────────────────────────────
export const strictOrderRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,

  keyGenerator: (req: any) => {
    if (req.user?.userId) {
      return `user:${req.user.userId}`;
    }
    return ipKeyGenerator(req);
  },

  handler: (req, res) => {
    return sendError(
      res,
      429,
      ErrorCode.RATE_LIMITED,
      ErrorMessage.RATE_LIMITED
    );
  },
});
