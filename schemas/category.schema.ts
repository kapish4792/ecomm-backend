import { z } from 'zod';

// ── POST /api/categories ──────────────────────────────────────────────────────
export const CreateCategorySchema = z.object({
  body: z.object({
    name: z.string().trim().min(1, 'Category name is required').max(100, 'Category name is too long'),
    description: z.string().trim().max(500, 'Description is too long').optional().nullable(),
    imageUrl: z.string().trim().url('Invalid image URL').or(z.string().trim().max(0)).optional().nullable(),
    isActive: z.boolean().optional().default(true),
  }),
});

// ── PUT /api/categories/:id ──────────────────────────────────────────────────
export const UpdateCategorySchema = z.object({
  params: z.object({
    id: z.coerce.number().int().positive('Invalid category ID'),
  }),
  body: z.object({
    name: z.string().trim().min(1, 'Category name cannot be empty').max(100, 'Category name is too long').optional(),
    description: z.string().trim().max(500, 'Description is too long').optional().nullable(),
    imageUrl: z.string().trim().url('Invalid image URL').or(z.string().trim().max(0)).optional().nullable(),
    isActive: z.boolean().optional(),
  }),
});

// ── DELETE /api/categories/:id ───────────────────────────────────────────────
export const DeleteCategorySchema = z.object({
  params: z.object({
    id: z.coerce.number().int().positive('Invalid category ID'),
  }),
});

// ── GET /api/categories/:id ──────────────────────────────────────────────────
export const GetCategorySchema = z.object({
  params: z.object({
    id: z.coerce.number().int().positive('Invalid category ID'),
  }),
});

// ── GET /api/categories/:id/products ─────────────────────────────────────────
export const GetCategoryProductsSchema = z.object({
  params: z.object({
    id: z.coerce.number().int().positive('Invalid category ID'),
  }),
  query: z.object({
    page: z.coerce.number().int().positive().optional().default(1),
    limit: z.coerce.number().int().positive().optional().default(10),
  }),
});

// ── GET /api/categories ──────────────────────────────────────────────────────
export const ListCategoriesSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().optional().default(1),
    limit: z.coerce.number().int().positive().optional().default(10),
    isActive: z.enum(['true', 'false']).optional().transform((val) => val === 'true'),
  }),
});
