import { z } from 'zod';

// ── POST /api/attributes — create attribute name (e.g., "Color") ─────────────
export const CreateAttributeSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1, 'Attribute name is required'),
  }),
});

// ── POST /api/attributes/:id/values — add a value to an attribute ────────────
export const CreateAttributeValueSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid attribute ID'),
  }),
  body: z.object({
    value: z.string().trim().min(1, 'Attribute value is required'),
  }),
});

// ── DELETE /api/attributes/:id ───────────────────────────────────────────────
export const DeleteAttributeSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid attribute ID'),
  }),
});

// ── GET /api/attributes/:id/values ──────────────────────────────────────────
export const GetAttributeValuesSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid attribute ID'),
  }),
});

// ── DELETE /api/attributes/values/:id ─────────────────────────────────────────
export const DeleteAttributeValueSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid attribute value ID'),
  }),
});
