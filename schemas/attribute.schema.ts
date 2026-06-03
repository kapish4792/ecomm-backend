import { z } from 'zod';
import { ErrorMessage } from '../utils/errorMessages.ts';

export const CreateAttributeSchema = z.object({
  params: z.object({
    productId: z.string().uuid(ErrorMessage.PRODUCT_ID_INVALID),
  }),
  body: z.object({
    key: z.string().trim().min(1, 'Attribute key is required'),
    value: z.string().trim().min(1, 'Attribute value is required'),
  }),
});

export const UpdateAttributeSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid attribute ID format'),
  }),
  body: z.object({
    key: z.string().trim().min(1, 'Attribute key is required').optional(),
    value: z.string().trim().min(1, 'Attribute value is required').optional(),
  }),
});

export const DeleteAttributeSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid attribute ID format'),
  }),
});

export const GetAttributeByIdSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid attribute ID format'),
  }),
});
