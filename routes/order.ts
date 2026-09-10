import express from 'express';
import { protect, authorize } from '../middleware/auth.ts';
import { validate } from '../middleware/validate.ts';
import { orderRateLimiter, strictOrderRateLimiter } from '../middleware/rateLimiter.ts';
import {
  createOrder,
  getOrder,
  listOrders,
  cancelOrder,
  retryPayment,
  getOrderEvents,
} from '../controllers/order.controller.ts';
import {
  CreateOrderSchema,
  GetOrderSchema,
  CancelOrderSchema,
  RetryPaymentSchema,
  GetOrderEventsSchema,
  ListOrdersSchema,
} from '../schemas/order.schema.ts';

// ─────────────────────────────────────────────────────────────────────────────
// ORDER ROUTES
//
// Middleware stack per endpoint:
//
//  POST   /api/orders
//    → protect (JWT auth)
//    → orderRateLimiter (20 req/min per user)
//    → validate (CreateOrderSchema)
//    → createOrder
//
//  GET    /api/orders
//    → protect
//    → validate (ListOrdersSchema — pagination query)
//    → listOrders
//
//  GET    /api/orders/:id
//    → protect
//    → validate (GetOrderSchema)
//    → getOrder
//
//  PATCH  /api/orders/:id/cancel
//    → protect
//    → validate (CancelOrderSchema)
//    → cancelOrder
//
//  POST   /api/orders/:id/retrypayment
//    → protect
//    → strictOrderRateLimiter (5 req/min)
//    → validate (RetryPaymentSchema)
//    → retryPayment
//
//  GET    /api/orders/:id/events
//    → protect
//    → authorize (ADMIN, SUPERADMIN)
//    → validate (GetOrderEventsSchema)
//    → getOrderEvents
// ─────────────────────────────────────────────────────────────────────────────

const router = express.Router();

// ── POST /api/orders — Create new order ──────────────────────────────────────
router.post(
  '/',
  protect,
  orderRateLimiter,
  validate(CreateOrderSchema),
  createOrder
);

// ── GET /api/orders — List orders (paginated) ────────────────────────────────
router.get(
  '/',
  protect,
  validate(ListOrdersSchema),
  listOrders
);

// ── GET /api/orders/:id — Get single order ───────────────────────────────────
router.get(
  '/:id',
  protect,
  validate(GetOrderSchema),
  getOrder
);

// ── PATCH /api/orders/:id/cancel — Cancel order ──────────────────────────────
router.patch(
  '/:id/cancel',
  protect,
  validate(CancelOrderSchema),
  cancelOrder
);

// ── POST /api/orders/:id/retrypayment — Retry failed payment ─────────────────
router.post(
  '/:id/retrypayment',
  protect,
  strictOrderRateLimiter,
  validate(RetryPaymentSchema),
  retryPayment
);

// ── GET /api/orders/:id/events — Full audit log (ADMIN only) ─────────────────
router.get(
  '/:id/events',
  protect,
  authorize(['ADMIN', 'SUPERADMIN']),
  validate(GetOrderEventsSchema),
  getOrderEvents
);

export default router;
