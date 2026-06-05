import express from 'express';
import { protect } from '../middleware/auth.ts';
import { validate } from '../middleware/validate.ts';
import {
  createAttribute,
  getAttributesByProduct,
  getAttributeById,
  updateAttribute,
  deleteAttribute,
  getAttributes,
  linkAttribute,
  unlinkAttribute
} from '../controllers/attribute.controller.ts';
import {
  CreateAttributeSchema,
  LinkAttributeSchema,
  UnlinkAttributeSchema,
  UpdateAttributeSchema,
  DeleteAttributeSchema,
  GetAttributeByIdSchema
} from '../schemas/attribute.schema.ts';

const router = express.Router();

// Get all unique global attributes
router.get("/attributes", getAttributes);

// Create a new global attribute
router.post("/attributes", protect, validate(CreateAttributeSchema), createAttribute);

// Get all attributes of a product
router.get("/products/:productId/attributes", getAttributesByProduct);

// Link an attribute (connectOrCreate) to a product
router.post("/products/:productId/attributes", protect, validate(LinkAttributeSchema), linkAttribute);

// Disconnect/Unlink an attribute from a product (does not delete the global attribute)
router.delete("/products/:productId/attributes/:attributeId", protect, validate(UnlinkAttributeSchema), unlinkAttribute);

// Get a single global attribute by ID
router.get("/attributes/:id", validate(GetAttributeByIdSchema), getAttributeById);

// Update a global attribute key/value by ID
router.put("/attributes/:id", protect, validate(UpdateAttributeSchema), updateAttribute);

// Delete a global attribute completely (removes it from all products)
router.delete("/attributes/:id", protect, validate(DeleteAttributeSchema), deleteAttribute);

export default router;
