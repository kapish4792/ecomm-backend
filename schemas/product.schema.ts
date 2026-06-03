import { z } from 'zod';
import { ErrorMessage } from '../utils/errorMessages.ts';

export const ProductVariantSchema = z.object({
  sku: z.string().trim().min(1, ErrorMessage.SKU_REQUIRED),
  size: z.string().trim().optional().nullable(),
  color: z.string().trim().optional().nullable(),
  stock: z.number().int().nonnegative(ErrorMessage.STOCK_NEGATIVE).default(0),
});

export const ProductAttributeSchema = z.object({
  key: z.string().trim().min(1, 'Attribute key is required'),
  value: z.string().trim().min(1, 'Attribute value is required'),
});

export const CreateProductSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1, ErrorMessage.PRODUCT_NAME_REQUIRED),
    price: z.union([
      z.number().positive(ErrorMessage.PRICE_POSITIVE),
      z.string().regex(/^\d+(\.\d{1,2})?$/, ErrorMessage.PRICE_INVALID)
    ]),
    category: z.string().trim().min(1, ErrorMessage.CATEGORY_REQUIRED),
    displayCategory: z.string().trim().optional().nullable(),
    imageUrl: z.string().trim().min(1, ErrorMessage.IMAGE_URL_REQUIRED),
    images: z.array(z.string().trim()).default([]),
    description: z.string().trim().min(1, ErrorMessage.DESCRIPTION_REQUIRED),
    attributes: z.array(ProductAttributeSchema).default([]),
    variants: z.array(ProductVariantSchema).min(1, ErrorMessage.VARIANTS_MIN_LENGTH),
  }),
});

export const UpdateProductSchema = z.object({
  params: z.object({
    id: z.string().uuid(ErrorMessage.PRODUCT_ID_INVALID),
  }),
  body: z.object({
    name: z.string().trim().min(1, ErrorMessage.PRODUCT_NAME_EMPTY).optional(),
    price: z.union([
      z.number().positive(ErrorMessage.PRICE_POSITIVE),
      z.string().regex(/^\d+(\.\d{1,2})?$/, ErrorMessage.PRICE_INVALID)
    ]).optional(),
    category: z.string().trim().min(1, ErrorMessage.CATEGORY_EMPTY).optional(),
    displayCategory: z.string().trim().optional().nullable(),
    imageUrl: z.string().trim().min(1, ErrorMessage.IMAGE_URL_EMPTY).optional(),
    images: z.array(z.string().trim()).optional(),
    description: z.string().trim().min(1, ErrorMessage.DESCRIPTION_EMPTY).optional(),
    attributes: z.array(ProductAttributeSchema).optional(),
    variants: z.array(ProductVariantSchema).optional(),
  }),
});

export const DeleteProductSchema = z.object({
  params: z.object({
    id: z.string().uuid(ErrorMessage.PRODUCT_ID_INVALID),
  }),
});

export const GetProductByIdSchema = z.object({
  params: z.object({
    id: z.string().uuid(ErrorMessage.PRODUCT_ID_INVALID),
  }),
});
