import express from 'express';
import { protect } from '../middleware/auth.ts';
import { validate } from '../middleware/validate.ts';
import {
  createVariant,
  getVariantsByProduct,
  getVariantById,
  updateVariant,
  deleteVariant,
  getVariants
} from '../controllers/variant.controller.ts';
import {
  CreateVariantSchema,
  UpdateVariantSchema,
  DeleteVariantSchema,
  GetVariantByIdSchema
} from '../schemas/variant.schema.ts';

const router = express.Router();

// Get all variants
router.get("/variants", getVariants);

// Get all variants of a product
router.get("/products/:productId/variants", getVariantsByProduct);

// Create a new variant for a product
router.post("/products/:productId/variants", protect, validate(CreateVariantSchema), createVariant);

// Get a single variant by ID
router.get("/variants/:id", validate(GetVariantByIdSchema), getVariantById);

// Update a variant by ID
router.put("/variants/:id", protect, validate(UpdateVariantSchema), updateVariant);

// Delete a variant by ID
router.delete("/variants/:id", protect, validate(DeleteVariantSchema), deleteVariant);

export default router;
