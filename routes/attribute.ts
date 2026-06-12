import express from 'express';
import { protect, authorize } from '../middleware/auth.ts';
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

// Create a new global attribute (protected, admin/superadmin only)
router.post("/attributes", protect, authorize(["ADMIN", "SUPERADMIN"]), validate(CreateAttributeSchema), createAttribute);

// Get all attributes of a product
router.get("/products/:productId/attributes", getAttributesByProduct);

// Link an attribute (connectOrCreate) to a product (protected, admin/superadmin only)
router.post("/products/:productId/attributes", protect, authorize(["ADMIN", "SUPERADMIN"]), validate(LinkAttributeSchema), linkAttribute);

// Disconnect/Unlink an attribute from a product (protected, admin/superadmin only)
router.delete("/products/:productId/attributes/:attributeId", protect, authorize(["ADMIN", "SUPERADMIN"]), validate(UnlinkAttributeSchema), unlinkAttribute);

// Get a single global attribute by ID
router.get("/attributes/:id", validate(GetAttributeByIdSchema), getAttributeById);

// Update a global attribute key/value by ID (protected, admin/superadmin only)
router.put("/attributes/:id", protect, authorize(["ADMIN", "SUPERADMIN"]), validate(UpdateAttributeSchema), updateAttribute);

// Delete a global attribute completely (protected, admin/superadmin only)
router.delete("/attributes/:id", protect, authorize(["ADMIN", "SUPERADMIN"]), validate(DeleteAttributeSchema), deleteAttribute);

export default router;
