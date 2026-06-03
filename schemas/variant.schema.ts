import { z } from 'zod';
import { ErrorMessage } from '../utils/errorMessages.ts';

export const CreateVariantSchema = z.object({
  params: z.object({
    productId: z.string().uuid(ErrorMessage.PRODUCT_ID_INVALID),
  }),
  body: z.object({
    sku: z.string().trim().min(1, ErrorMessage.SKU_REQUIRED),
    size: z.string().trim().optional().nullable(),
    color: z.string().trim().optional().nullable(),
    stock: z.number().int().nonnegative(ErrorMessage.STOCK_NEGATIVE).default(0),
  }),
});

export const UpdateVariantSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid variant ID format'),
  }),
  body: z.object({
    sku: z.string().trim().min(1, ErrorMessage.SKU_REQUIRED).optional(),
    size: z.string().trim().optional().nullable(),
    color: z.string().trim().optional().nullable(),
    stock: z.number().int().nonnegative(ErrorMessage.STOCK_NEGATIVE).optional(),
  }),
});

export const DeleteVariantSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid variant ID format'),
  }),
});

export const GetVariantByIdSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid variant ID format'),
  }),
});
