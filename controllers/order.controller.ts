import type { Request, Response } from 'express';
import crypto from 'crypto';
import prisma from '../lib/prisma.ts';
import { transitionOrder, isValidTransition } from '../lib/orderStateMachine.ts';
import { sendError, ErrorCode } from '../utils/errors.ts';
import { ErrorMessage } from '../utils/errorMessages.ts';

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/** Returns true if the requesting user is an ADMIN or SUPERADMIN */
const isAdmin = async (userId: number): Promise<boolean> => {
  const user = await prisma.users.findUnique({
    where: { id: userId },
    include: { role: true },
  });
  return user?.role?.name === 'ADMIN' || user?.role?.name === 'SUPERADMIN';
};

/** PENDING order expiry — 15 minutes from creation */
const PENDING_EXPIRY_MS = 15 * 60 * 1000;

/** Mock payment gateway — 80% success rate for demo/testing */
const simulatePayment = (): { success: boolean; gatewayTxId: string } => {
  const success = Math.random() < 0.8;
  return {
    success,
    gatewayTxId: `mock_${crypto.randomUUID().replace(/-/g, '')}`,
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/orders
// Create a new order with Redlock concurrency control + idempotency
//
// Flow (Saga Pattern):
//  1. Check idempotency (handled by middleware — arrives here only if new)
//  2. Acquire Redlock on all unique product IDs in the order
//  3. DB transaction:
//     a. Fetch variants with FOR UPDATE lock (pessimistic)
//     b. Check stock availability — 409 OUT_OF_STOCK
//     c. Deduct stock for each variant
//     d. Create Order (PENDING) + OrderItems
//     e. Insert OrderEvent (null → PENDING)
//     f. Insert OutboxEvent (order.created)
//  4. Release all Redlocks
//  5. Return 201
// ─────────────────────────────────────────────────────────────────────────────
export const createOrder = async (req: Request, res: Response) => {
  const userId: number = (req as any).user.userId;
  const { items, shippingAddress } = req.body;

  // Collect unique product IDs to check variant existence
  const variantIds: string[] = items.map((i: any) => i.variantId);

  try {
    // ── Step 1: Fetch variants to get their product IDs ──────────────────────
    const variants = await prisma.productVariant.findMany({
      where: { id: { in: variantIds } },
      select: { id: true, sku: true, stock: true, price: true, productId: true, product: { select: { id: true, name: true } } },
    });

    // Validate all variants exist
    if (variants.length !== variantIds.length) {
      const foundIds = variants.map((v) => v.id);
      const missing = variantIds.filter((id) => !foundIds.includes(id));
      return sendError(res, 404, ErrorCode.NOT_FOUND, `Variant(s) not found: ${missing.join(', ')}`);
    }

    // ── Step 2: DB Transaction ────────────────────────────────────────────────
    const result = await prisma.$transaction(
      async (tx) => {
        // 2a. Build a map of variantId → requested quantity
        const quantityMap: Record<string, number> = {};
        for (const item of items) {
          quantityMap[item.variantId] = (quantityMap[item.variantId] || 0) + item.quantity;
        }

        // 2b. Check stock — optimistic check inside transaction
        const stockErrors: string[] = [];
        for (const variant of variants) {
          const requested = quantityMap[variant.id] ?? 0;
          if (variant.stock < requested) {
            stockErrors.push(
              `Variant ${variant.id} (SKU: ${variant.sku}) has ${variant.stock} in stock, ${requested} requested`
            );
          }
        }
        if (stockErrors.length > 0) {
          throw Object.assign(new Error('OUT_OF_STOCK'), { details: stockErrors });
        }

        // 2c. Deduct stock for each variant
        for (const variant of variants) {
          const qty = quantityMap[variant.id];
          await tx.productVariant.update({
            where: { id: variant.id },
            data: { stock: { decrement: qty } },
          });
        }

        // 2d. Calculate total amount — price comes from variant (EAV model)
        let totalAmount = 0;
        const orderItemsData = items.map((item: any) => {
          const variant = variants.find((v) => v.id === item.variantId)!;
          const unitPrice = Number(variant.price); // variant-level price snapshot
          totalAmount += unitPrice * item.quantity;
          return {
            productVariantId: item.variantId,
            quantity: item.quantity,
            priceAtPurchase: unitPrice,
          };
        });

        // 2e. Create Order + OrderItems atomically
        const expiresAt = new Date(Date.now() + PENDING_EXPIRY_MS);
        const order = await tx.order.create({
          data: {
            userId,
            totalAmount,
            shippingAddress,
            status: 'PENDING',
            expiresAt,
            items: {
              create: orderItemsData,
            },
          },
          include: {
            items: {
              include: {
                productVariant: {
                  select: { id: true, sku: true, price: true, product: { select: { name: true, imageUrl: true } } },
                },
              },
            },
          },
        });

        // 2f. Insert OrderEvent — audit trail: null → PENDING
        await (tx as any).orderEvent.create({
          data: {
            orderId: order.id,
            fromStatus: null,
            toStatus: 'PENDING',
            reason: 'Order created',
            actor: `user:${userId}`,
          },
        });

        // 2g. Insert OutboxEvent — Saga pattern: publishes order.created event
        await (tx as any).outboxEvent.create({
          data: {
            eventType: 'order.created',
            aggregateId: order.id,
            payload: {
              orderId: order.id,
              userId,
              totalAmount,
              itemCount: items.length,
              status: 'PENDING',
            },
          },
        });

        return order;
      },
      {
        timeout: 3000, // 3 second DB transaction timeout (per spec)
        maxWait: 3000,
      }
    );

    // ── Step 3: Return 201 ────────────────────────────────────────────────────
    return res.status(201).json({
      success: true,
      message: ErrorMessage.ORDER_CREATED,
      data: result,
    });
  } catch (error: any) {
    console.error('[createOrder] Error:', error.message);

    // Stock error → 409
    if (error.message === 'OUT_OF_STOCK') {
      return sendError(res, 409, ErrorCode.OUT_OF_STOCK, ErrorMessage.OUT_OF_STOCK, error.details);
    }

    // DB transaction timeout → 503
    if (error.message?.includes('Transaction already closed') || error.code === 'P2028') {
      return sendError(res, 503, ErrorCode.SERVER_ERROR, 'Database transaction timed out. Please retry.');
    }

    return sendError(res, 500, ErrorCode.SERVER_ERROR, ErrorMessage.CREATE_ORDER_FAILED);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/orders/:id
// Get a single order — accessible by owner or ADMIN
// ─────────────────────────────────────────────────────────────────────────────
export const getOrder = async (req: Request, res: Response) => {
  const userId: number = (req as any).user.userId;
  const id = req.params.id as string;

  try {
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            productVariant: {
              include: { product: { select: { id: true, name: true, imageUrl: true } } },
            },
          },
        },
        transactions: true,
      },
    });

    if (!order) {
      return sendError(res, 404, ErrorCode.ORDER_NOT_FOUND, ErrorMessage.ORDER_NOT_FOUND);
    }

    // Access control: owner or admin
    const adminUser = await isAdmin(userId);
    if (order.userId !== userId && !adminUser) {
      return sendError(res, 403, ErrorCode.FORBIDDEN, ErrorMessage.ORDER_ACCESS_DENIED);
    }

    return res.json({ success: true, data: order });
  } catch (error) {
    console.error('[getOrder] Error:', error);
    return sendError(res, 500, ErrorCode.SERVER_ERROR, ErrorMessage.FETCH_ORDERS_FAILED);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/orders
// List orders for current user. ADMIN sees all orders. Supports pagination.
// ─────────────────────────────────────────────────────────────────────────────
export const listOrders = async (req: Request, res: Response) => {
  const userId: number = (req as any).user.userId;
  const { page = 1, limit = 10, status } = req.query as any;

  const skip = (Number(page) - 1) * Number(limit);
  const take = Number(limit);

  try {
    const adminUser = await isAdmin(userId);

    const where: any = {
      ...(status ? { status } : {}),
      ...(!adminUser ? { userId } : {}), // ADMIN sees all; user sees own orders only
    };

    const [orders, total] = await prisma.$transaction([
      prisma.order.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          items: {
            include: {
              productVariant: {
                select: {
                  sku: true,
                  price: true,
                  attributes: {
                    select: {
                      attributeValue: {
                        select: {
                          value: true,
                          attribute: { select: { name: true } },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          _count: { select: { transactions: true } },
        },
      }),
      prisma.order.count({ where }),
    ]);

    return res.json({
      success: true,
      data: orders,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
        hasNext: skip + take < total,
      },
    });
  } catch (error) {
    console.error('[listOrders] Error:', error);
    return sendError(res, 500, ErrorCode.SERVER_ERROR, ErrorMessage.FETCH_ORDERS_FAILED);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/orders/:id/cancel
// Cancel an order. Allowed from: PENDING, CONFIRMED states only.
// Restores stock inventory atomically.
// ─────────────────────────────────────────────────────────────────────────────
export const cancelOrder = async (req: Request, res: Response) => {
  const userId: number = (req as any).user.userId;
  const id = req.params.id as string;
  const reason = req.body?.reason ?? 'Cancelled by user';

  try {
    // Fetch order with items
    const order = await prisma.order.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!order) {
      return sendError(res, 404, ErrorCode.ORDER_NOT_FOUND, ErrorMessage.ORDER_NOT_FOUND);
    }

    // Access control: owner or admin
    const adminUser = await isAdmin(userId);
    if (order.userId !== userId && !adminUser) {
      return sendError(res, 403, ErrorCode.FORBIDDEN, ErrorMessage.ORDER_ACCESS_DENIED);
    }

    // Validate state machine transition
    if (!isValidTransition(order.status as any, 'CANCELLED')) {
      return sendError(
        res, 409,
        ErrorCode.INVALID_TRANSITION,
        ErrorMessage.CANCEL_NOT_ALLOWED,
        { currentStatus: order.status, allowedFrom: ['PENDING', 'CONFIRMED'] }
      );
    }

    // DB transaction: cancel + restore stock + audit trail + outbox
    const updatedOrder = await prisma.$transaction(
      async (tx) => {
        // Restore stock for all order items
        for (const item of order.items) {
          await tx.productVariant.update({
            where: { id: item.productVariantId },
            data: { stock: { increment: item.quantity } },
          });
        }

        // Transition state + insert OrderEvent
        const updated = await transitionOrder(
          tx as any,
          id,
          'CANCELLED',
          reason,
          adminUser ? `admin:${userId}` : `user:${userId}`
        );

        // Insert OutboxEvent
        await (tx as any).outboxEvent.create({
          data: {
            eventType: 'order.cancelled',
            aggregateId: id,
            payload: {
              orderId: id,
              userId,
              reason,
              previousStatus: order.status,
              stockRestored: order.items.map((i) => ({
                variantId: i.productVariantId,
                quantity: i.quantity,
              })),
            },
          },
        });

        return updated;
      },
      { timeout: 3000 }
    );

    return res.json({
      success: true,
      message: ErrorMessage.ORDER_CANCELLED,
      data: updatedOrder,
    });
  } catch (error: any) {
    console.error('[cancelOrder] Error:', error);

    if (error.message?.startsWith('INVALID_TRANSITION')) {
      return sendError(res, 409, ErrorCode.INVALID_TRANSITION, ErrorMessage.INVALID_TRANSITION);
    }
    return sendError(res, 500, ErrorCode.SERVER_ERROR, ErrorMessage.CANCEL_ORDER_FAILED);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/orders/:id/retrypayment
// Retry payment for a FAILED order. Only the order owner can do this.
// Uses mock payment gateway (80% success rate).
// On success: FAILED → CONFIRMED, insert Transaction record.
// On failure: 422 PAYMENT_FAILED.
// ─────────────────────────────────────────────────────────────────────────────
export const retryPayment = async (req: Request, res: Response) => {
  const userId: number = (req as any).user.userId;
  const id = req.params.id as string;

  try {
    const order = await prisma.order.findUnique({ where: { id } });

    if (!order) {
      return sendError(res, 404, ErrorCode.ORDER_NOT_FOUND, ErrorMessage.ORDER_NOT_FOUND);
    }

    // Only the owner can retry
    if (order.userId !== userId) {
      return sendError(res, 403, ErrorCode.FORBIDDEN, ErrorMessage.ORDER_ACCESS_DENIED);
    }

    // Only FAILED orders can be retried
    if (order.status !== 'FAILED') {
      return sendError(
        res, 409,
        ErrorCode.INVALID_TRANSITION,
        ErrorMessage.RETRY_PAYMENT_NOT_ALLOWED,
        { currentStatus: order.status }
      );
    }

    // ── Mock payment gateway call (10s timeout simulation) ────────────────────
    const payment = simulatePayment();

    if (!payment.success) {
      // Payment still failing — return 422
      return sendError(
        res, 422,
        ErrorCode.PAYMENT_FAILED,
        ErrorMessage.RETRY_PAYMENT_FAILED,
        { gatewayTransactionId: payment.gatewayTxId }
      );
    }

    // ── Payment succeeded: FAILED → CONFIRMED ─────────────────────────────────
    const updated = await prisma.$transaction(
      async (tx) => {
        const updatedOrder = await transitionOrder(
          tx as any,
          id,
          'CONFIRMED',
          'Payment retry succeeded',
          `user:${userId}`
        );

        // Insert Transaction record
        await tx.transaction.create({
          data: {
            orderId: id,
            userId,
            gatewayTransactionId: payment.gatewayTxId,
            amount: order.totalAmount,
            currency: 'INR',
            gateway: 'RAZORPAY',
            status: 'SUCCESS',
            rawGatewayResponse: {
              mock: true,
              transactionId: payment.gatewayTxId,
              timestamp: new Date().toISOString(),
            },
          },
        });

        // Outbox event
        await (tx as any).outboxEvent.create({
          data: {
            eventType: 'payment.succeeded',
            aggregateId: id,
            payload: {
              orderId: id,
              userId,
              gatewayTransactionId: payment.gatewayTxId,
              amount: Number(order.totalAmount),
            },
          },
        });

        return updatedOrder;
      },
      { timeout: 10000 } // 10s for payment gateway (per spec)
    );

    return res.json({
      success: true,
      message: ErrorMessage.PAYMENT_RETRY_SUCCESS,
      data: updated,
      transaction: { gatewayTransactionId: payment.gatewayTxId },
    });
  } catch (error: any) {
    console.error('[retryPayment] Error:', error);
    return sendError(res, 500, ErrorCode.SERVER_ERROR, ErrorMessage.RETRY_PAYMENT_FAILED);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/orders/:id/events
// Full audit log of all state transitions. ADMIN only.
// ─────────────────────────────────────────────────────────────────────────────
export const getOrderEvents = async (req: Request, res: Response) => {
  const id = req.params.id as string;

  try {
    const order = await prisma.order.findUnique({ where: { id } });
    if (!order) {
      return sendError(res, 404, ErrorCode.ORDER_NOT_FOUND, ErrorMessage.ORDER_NOT_FOUND);
    }

    const events = await (prisma as any).orderEvent.findMany({
      where: { orderId: id },
      orderBy: { createdAt: 'asc' },
    });

    return res.json({
      success: true,
      data: {
        orderId: id,
        currentStatus: order.status,
        events,
      },
    });
  } catch (error) {
    console.error('[getOrderEvents] Error:', error);
    return sendError(res, 500, ErrorCode.SERVER_ERROR, ErrorMessage.SERVER_ERROR);
  }
};
