import express from 'express';
import { protect } from '../middleware/auth.ts';
import { validate } from '../middleware/validate.ts';
import {
  createAttribute,
  getAttributesByProduct,
  getAttributeById,
  updateAttribute,
  deleteAttribute,
  getAttributes
} from '../controllers/attribute.controller.ts';
import {
  CreateAttributeSchema,
  UpdateAttributeSchema,
  DeleteAttributeSchema,
  GetAttributeByIdSchema
} from '../schemas/attribute.schema.ts';

const router = express.Router();

// Get all attributes
router.get("/attributes", getAttributes);

// Get all attributes of a product
router.get("/products/:productId/attributes", getAttributesByProduct);

// Create a new attribute for a product
router.post("/products/:productId/attributes", protect, validate(CreateAttributeSchema), createAttribute);

// Get a single attribute by ID
router.get("/attributes/:id", validate(GetAttributeByIdSchema), getAttributeById);

// Update an attribute by ID
router.put("/attributes/:id", protect, validate(UpdateAttributeSchema), updateAttribute);

// Delete an attribute by ID
router.delete("/attributes/:id", protect, validate(DeleteAttributeSchema), deleteAttribute);

export default router;
