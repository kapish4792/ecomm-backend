import { z } from 'zod';
import { ErrorMessage } from '../utils/errorMessages.ts';

const AttributeInputSchema = z.object({
  name:  z.string().trim().min(1, 'Attribute name is required'),
  value: z.string().trim().min(1, 'Attribute value is required'),
});

// ── POST /api/products/:productId/variants ───────────────────────────────────
export const CreateVariantSchema = z.object({
  params: z.object({
    productId: z.string().uuid(ErrorMessage.PRODUCT_ID_INVALID),
  }),
  body: z.object({
    sku:        z.string().trim().min(1, ErrorMessage.SKU_REQUIRED),
    price:      z.union([
      z.number().positive(ErrorMessage.PRICE_POSITIVE),
      z.string().regex(/^\d+(\.\d{1,2})?$/, ErrorMessage.PRICE_INVALID),
    ]),
    stock:      z.number().int().nonnegative(ErrorMessage.STOCK_NEGATIVE).default(0),
    attributes: z.array(AttributeInputSchema).min(1, 'At least one attribute is required'),
  }),
});

// ── PUT /api/variants/:id ────────────────────────────────────────────────────
export const UpdateVariantSchema = z.object({
  params: z.object({
    id: z.string().regex(/^var_\d{5}$/, 'Invalid variant ID format'),
  }),
  body: z.object({
    sku:        z.string().trim().min(1, ErrorMessage.SKU_REQUIRED).optional(),
    price:      z.union([
      z.number().positive(ErrorMessage.PRICE_POSITIVE),
      z.string().regex(/^\d+(\.\d{1,2})?$/, ErrorMessage.PRICE_INVALID),
    ]).optional(),
    stock:      z.number().int().nonnegative(ErrorMessage.STOCK_NEGATIVE).optional(),
    attributes: z.array(AttributeInputSchema).optional(), // full replace if provided
  }),
});

// ── DELETE /api/variants/:id ─────────────────────────────────────────────────
export const DeleteVariantSchema = z.object({
  params: z.object({
    id: z.string().regex(/^var_\d{5}$/, 'Invalid variant ID format'),
  }),
});

// ── GET /api/variants/:id ────────────────────────────────────────────────────
export const GetVariantByIdSchema = z.object({
  params: z.object({
    id: z.string().regex(/^var_\d{5}$/, 'Invalid variant ID format'),
  }),
});
