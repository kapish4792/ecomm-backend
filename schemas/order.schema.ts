import { z } from 'zod';

// ─────────────────────────────────────────────────────────────────────────────
// ORDER SCHEMAS — Zod validation for all order endpoints
// ─────────────────────────────────────────────────────────────────────────────

// Shipping address sub-schema
const ShippingAddressSchema = z.object({
  name:       z.string().trim().min(1, 'Recipient name is required'),
  line1:      z.string().trim().min(1, 'Address line 1 is required'),
  line2:      z.string().trim().optional(),
  city:       z.string().trim().min(1, 'City is required'),
  state:      z.string().trim().min(1, 'State is required'),
  postalCode: z.string().trim().min(1, 'Postal code is required'),
  country:    z.string().trim().min(2, 'Country is required').default('IN'),
  phone:      z.string().trim().optional(),
});

// Single order line item
const OrderItemInputSchema = z.object({
  variantId: z.string().regex(/^var_\d{5}$/, 'Variant ID must be a valid variant ID'),
  quantity:  z.number().int().positive('Quantity must be a positive integer'),
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /orders
// ─────────────────────────────────────────────────────────────────────────────
export const CreateOrderSchema = z.object({
  body: z.object({
    items: z
      .array(OrderItemInputSchema)
      .min(1, 'At least one order item is required'),
    shippingAddress: ShippingAddressSchema,
  }),
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /orders/:id
// ─────────────────────────────────────────────────────────────────────────────
export const GetOrderSchema = z.object({
  params: z.object({
    id: z.string().uuid('Order ID must be a valid UUID'),
  }),
});

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /orders/:id/cancel
// ─────────────────────────────────────────────────────────────────────────────
export const CancelOrderSchema = z.object({
  params: z.object({
    id: z.string().uuid('Order ID must be a valid UUID'),
  }),
  body: z.object({
    reason: z.string().trim().max(500).optional(),
  }).optional(),
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /orders/:id/retrypayment
// ─────────────────────────────────────────────────────────────────────────────
export const RetryPaymentSchema = z.object({
  params: z.object({
    id: z.string().uuid('Order ID must be a valid UUID'),
  }),
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /orders/:id/events
// ─────────────────────────────────────────────────────────────────────────────
export const GetOrderEventsSchema = z.object({
  params: z.object({
    id: z.string().uuid('Order ID must be a valid UUID'),
  }),
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /orders  — paginated list
// ─────────────────────────────────────────────────────────────────────────────
export const ListOrdersSchema = z.object({
  query: z.object({
    page:   z.coerce.number().int().positive().optional().default(1),
    limit:  z.coerce.number().int().min(1).max(100).optional().default(10),
    status: z.enum([
      'PENDING', 'CONFIRMED', 'PROCESSING',
      'SHIPPED', 'DELIVERED', 'CANCELLED',
      'FAILED', 'RETURNED',
    ]).optional(),
  }),
});

export type CreateOrderInput   = z.infer<typeof CreateOrderSchema>['body'];
export type ListOrdersQuery    = z.infer<typeof ListOrdersSchema>['query'];
