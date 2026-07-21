import { z } from 'zod';
import { ErrorMessage } from '../utils/errorMessages.ts';

// ── Attribute input for a variant (by name + value) ─────────────────────────
const VariantAttributeInputSchema = z.object({
  name:  z.string().trim().min(1, 'Attribute name is required'),   // e.g., "Color"
  value: z.string().trim().min(1, 'Attribute value is required'),  // e.g., "Red"
});

// ── Single variant in a product create/update ────────────────────────────────
export const ProductVariantSchema = z.object({
  sku:        z.string().trim().min(1, ErrorMessage.SKU_REQUIRED),
  price:      z.union([
    z.number().positive(ErrorMessage.PRICE_POSITIVE),
    z.string().regex(/^\d+(\.\d{1,2})?$/, ErrorMessage.PRICE_INVALID),
  ]),
  stock:      z.number().int().nonnegative(ErrorMessage.STOCK_NEGATIVE).default(0),
  attributes: z.array(VariantAttributeInputSchema).min(1, 'At least one attribute is required per variant'),
});

// ── POST /api/products ───────────────────────────────────────────────────────
export const CreateProductSchema = z.object({
  body: z.object({
    name:            z.string().trim().min(1, ErrorMessage.PRODUCT_NAME_REQUIRED),
    basePrice:       z.union([
      z.number().positive(ErrorMessage.PRICE_POSITIVE),
      z.string().regex(/^\d+(\.\d{1,2})?$/, ErrorMessage.PRICE_INVALID),
    ]),
    category:        z.string().trim().min(1, ErrorMessage.CATEGORY_REQUIRED),
    displayCategory: z.string().trim().optional().nullable(),
    imageUrl:        z.string().trim().optional().default(''),
    images:          z.array(z.string().trim()).default([]),
    description:     z.string().trim().min(1, ErrorMessage.DESCRIPTION_REQUIRED),
    status:          z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).optional().default('DRAFT'),
    variants:        z.array(ProductVariantSchema).min(1, ErrorMessage.VARIANTS_MIN_LENGTH),
  }),
});

// ── PUT /api/products/:id ────────────────────────────────────────────────────
export const UpdateProductSchema = z.object({
  params: z.object({
    id: z.string().min(1, ErrorMessage.PRODUCT_ID_INVALID),
  }),
  body: z.object({
    name:            z.string().trim().min(1, ErrorMessage.PRODUCT_NAME_EMPTY).optional(),
    basePrice:       z.union([
      z.number().positive(ErrorMessage.PRICE_POSITIVE),
      z.string().regex(/^\d+(\.\d{1,2})?$/, ErrorMessage.PRICE_INVALID),
    ]).optional(),
    category:        z.string().trim().min(1, ErrorMessage.CATEGORY_EMPTY).optional(),
    displayCategory: z.string().trim().optional().nullable(),
    imageUrl:        z.string().trim().min(1, ErrorMessage.IMAGE_URL_EMPTY).optional(),
    images:          z.array(z.string().trim()).optional(),
    description:     z.string().trim().min(1, ErrorMessage.DESCRIPTION_EMPTY).optional(),
    status:          z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).optional(),
  }),
});

// ── DELETE /api/products/:id ─────────────────────────────────────────────────
export const DeleteProductSchema = z.object({
  params: z.object({
    id: z.string().min(1, ErrorMessage.PRODUCT_ID_INVALID),
  }),
});

// ── GET /api/products/:id ────────────────────────────────────────────────────
export const GetProductByIdSchema = z.object({
  params: z.object({
    id: z.string().min(1, ErrorMessage.PRODUCT_ID_INVALID),
  }),
});
