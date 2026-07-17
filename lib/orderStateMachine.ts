import type { PrismaClient } from '../generated/prisma/index.js';

// ─────────────────────────────────────────────────────────────────────────────
// ORDER STATE MACHINE
//
// Enforces legal state transitions for the Order lifecycle:
//
//  PENDING     → CONFIRMED, CANCELLED, FAILED
//  CONFIRMED   → PROCESSING, CANCELLED
//  PROCESSING  → SHIPPED, CANCELLED
//  SHIPPED     → DELIVERED, RETURNED
//  DELIVERED   → RETURNED
//  CANCELLED   → (terminal)
//  FAILED      → (terminal)
//  RETURNED    → (terminal)
// ─────────────────────────────────────────────────────────────────────────────

export type OrderStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'PROCESSING'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'FAILED'
  | 'RETURNED';

// Terminal states — no further transitions allowed
export const TERMINAL_STATES = new Set<OrderStatus>([
  'CANCELLED',
  'FAILED',
  'RETURNED',
]);

// Allowed next states for each current state
export const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING:    ['CONFIRMED', 'CANCELLED', 'FAILED'],
  CONFIRMED:  ['PROCESSING', 'CANCELLED'],
  PROCESSING: ['SHIPPED', 'CANCELLED'],
  SHIPPED:    ['DELIVERED', 'RETURNED'],
  DELIVERED:  ['RETURNED'],
  CANCELLED:  [],
  FAILED:     [],
  RETURNED:   [],
};

// ─────────────────────────────────────────────────────────────────────────────
// isValidTransition
//
// Returns true when a transition from `from` → `to` is permitted by the
// state machine. Used to gate all status update operations.
// ─────────────────────────────────────────────────────────────────────────────
export const isValidTransition = (from: OrderStatus, to: OrderStatus): boolean => {
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
};

// ─────────────────────────────────────────────────────────────────────────────
// transitionOrder
//
// Performs a validated state transition within a Prisma transaction:
//   1. Fetches current order status
//   2. Validates the transition via the state machine
//   3. Updates order.status in DB
//   4. Inserts an OrderEvent audit record
//
// @param tx        Prisma transaction client (from prisma.$transaction)
// @param orderId   The order to transition
// @param toStatus  The target state
// @param reason    Optional human-readable reason (logged in audit trail)
// @param actor     Who triggered the transition: "user:42", "system", "cron", "webhook"
// @returns         Updated order object
// @throws          Error if transition is invalid (caller handles 409)
// ─────────────────────────────────────────────────────────────────────────────
export const transitionOrder = async (
  tx: Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>,
  orderId: string,
  toStatus: OrderStatus,
  reason?: string,
  actor?: string
) => {
  // Fetch current order
  const order = await tx.order.findUnique({ where: { id: orderId } });
  if (!order) {
    throw new Error(`ORDER_NOT_FOUND:${orderId}`);
  }

  const fromStatus = order.status as OrderStatus;

  if (!isValidTransition(fromStatus, toStatus)) {
    throw new Error(`INVALID_TRANSITION:${fromStatus}:${toStatus}`);
  }

  // Update order status
  const updated = await tx.order.update({
    where: { id: orderId },
    data: { status: toStatus },
  });

  // Insert audit trail event
  await (tx as any).orderEvent.create({
    data: {
      orderId,
      fromStatus,
      toStatus,
      reason: reason ?? null,
      actor: actor ?? 'system',
    },
  });

  return updated;
};
