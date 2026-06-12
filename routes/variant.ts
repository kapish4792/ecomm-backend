import express from 'express';
import { protect, authorize } from '../middleware/auth.ts';
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

// Create a new variant for a product (protected, admin/superadmin only)
router.post("/products/:productId/variants", protect, authorize(["ADMIN", "SUPERADMIN"]), validate(CreateVariantSchema), createVariant);

// Get a single variant by ID
router.get("/variants/:id", validate(GetVariantByIdSchema), getVariantById);

// Update a variant by ID (protected, admin/superadmin only)
router.put("/variants/:id", protect, authorize(["ADMIN", "SUPERADMIN"]), validate(UpdateVariantSchema), updateVariant);

// Delete a variant by ID (protected, admin/superadmin only)
router.delete("/variants/:id", protect, authorize(["ADMIN", "SUPERADMIN"]), validate(DeleteVariantSchema), deleteVariant);

export default router;
