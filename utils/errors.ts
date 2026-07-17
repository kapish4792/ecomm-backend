import type { Response } from 'express';

// ─────────────────────────────────────────────────────────────────────────────
// ERROR CODES
// Maps directly to the Error Response Standard from the API specification.
// ─────────────────────────────────────────────────────────────────────────────

export const ErrorCode = {
  // General
  VALIDATION_ERROR:   'VALIDATION_ERROR',    // 400 — missing fields, invalid format
  BAD_REQUEST:        'BAD_REQUEST',          // 400 — malformed request
  UNAUTHORIZED:       'UNAUTHORIZED',         // 401 — missing or invalid auth token
  FORBIDDEN:          'FORBIDDEN',            // 403 — insufficient permissions
  NOT_FOUND:          'NOT_FOUND',            // 404 — generic resource not found
  SERVER_ERROR:       'SERVER_ERROR',         // 500 — internal server error
  CONFLICT:           'CONFLICT',             // 409 — generic conflict

  // Order-specific (per API specification)
  ORDER_NOT_FOUND:      'ORDER_NOT_FOUND',    // 404 — order ID does not exist
  DUPLICATE_REQUEST:    'DUPLICATE_REQUEST',  // 409 — idempotency key already processed
  OUT_OF_STOCK:         'OUT_OF_STOCK',       // 409 — stock unavailable at time of write
  INVALID_TRANSITION:   'INVALID_TRANSITION', // 409 — invalid state machine transition
  PAYMENT_FAILED:       'PAYMENT_FAILED',     // 422 — card declined or payment error
  RATE_LIMITED:         'RATE_LIMITED',       // 429 — per-user rate limit exceeded
  LOCK_UNAVAILABLE:     'LOCK_UNAVAILABLE',   // 503 — product locked by concurrent request

  // Webhook
  WEBHOOK_INVALID:      'WEBHOOK_INVALID',    // 401 — invalid webhook signature
} as const;

export type ErrorCodeType = typeof ErrorCode[keyof typeof ErrorCode];

// ─────────────────────────────────────────────────────────────────────────────
// sendError — Standard API error responder
// All error responses follow the shape:
//   { success: false, error: { code, message, details? } }
// ─────────────────────────────────────────────────────────────────────────────
export const sendError = (
  res: Response,
  status: number,
  code: ErrorCodeType | string,
  message: string,
  details?: any
) => {
  return res.status(status).json({
    success: false,
    error: {
      code,
      message,
      ...(details !== undefined ? { details } : {}),
    },
  });
};
