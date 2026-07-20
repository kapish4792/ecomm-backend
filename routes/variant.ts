import express from 'express';
import { protect, authorize } from '../middleware/auth.ts';
import { validate } from '../middleware/validate.ts';
import {
  getVariants,
  getVariantsByProduct,
  getVariantById,
  createVariant,
  updateVariant,
  deleteVariant,
} from '../controllers/variant.controller.ts';
import {
  CreateVariantSchema,
  UpdateVariantSchema,
  DeleteVariantSchema,
  GetVariantByIdSchema,
} from '../schemas/variant.schema.ts';

const router = express.Router();

// GET /api/variants — list all variants across all products
router.get('/variants', getVariants);

// GET /api/products/:productId/variants — list variants for a product
router.get('/products/:productId/variants', getVariantsByProduct);

// POST /api/products/:productId/variants — add variant to product (ADMIN/SUPERADMIN)
router.post('/products/:productId/variants', protect, authorize(['ADMIN', 'SUPERADMIN']), validate(CreateVariantSchema), createVariant);

// GET /api/variants/:id — get single variant with attributes
router.get('/variants/:id', validate(GetVariantByIdSchema), getVariantById);

// PUT /api/variants/:id — update variant (ADMIN/SUPERADMIN)
router.put('/variants/:id', protect, authorize(['ADMIN', 'SUPERADMIN']), validate(UpdateVariantSchema), updateVariant);

// DELETE /api/variants/:id — delete variant (ADMIN/SUPERADMIN)
router.delete('/variants/:id', protect, authorize(['ADMIN', 'SUPERADMIN']), validate(DeleteVariantSchema), deleteVariant);

export default router;
