import express from 'express';
import { protect, authorize } from '../middleware/auth.ts';
import { validate } from '../middleware/validate.ts';
import {
  getAttributes,
  createAttribute,
  getAttributeValues,
  createAttributeValue,
  deleteAttribute,
  deleteAttributeValue,
} from '../controllers/attribute.controller.ts';
import {
  CreateAttributeSchema,
  CreateAttributeValueSchema,
  DeleteAttributeSchema,
  GetAttributeValuesSchema,
  DeleteAttributeValueSchema,
} from '../schemas/attribute.schema.ts';

const router = express.Router();

// GET /api/attributes — list all attribute names and their values
router.get('/attributes', getAttributes);

// POST /api/attributes — create a new attribute name (ADMIN/SUPERADMIN)
router.post('/attributes', protect, authorize(['ADMIN', 'SUPERADMIN']), validate(CreateAttributeSchema), createAttribute);

// POST /api/attributes/:id/values — add a value to an attribute (ADMIN/SUPERADMIN)
router.post('/attributes/:id/values', protect, authorize(['ADMIN', 'SUPERADMIN']), validate(CreateAttributeValueSchema), createAttributeValue);

// GET /api/attributes/:id/values — get all values for a specific attribute
router.get('/attributes/:id/values', validate(GetAttributeValuesSchema), getAttributeValues);

// DELETE /api/attributes/:id — delete attribute and all its values (ADMIN/SUPERADMIN)
router.delete('/attributes/:id', protect, authorize(['ADMIN', 'SUPERADMIN']), validate(DeleteAttributeSchema), deleteAttribute);

// DELETE /api/attributes/values/:id — delete a specific attribute value (ADMIN/SUPERADMIN)
router.delete('/attributes/values/:id', protect, authorize(['ADMIN', 'SUPERADMIN']), validate(DeleteAttributeValueSchema), deleteAttributeValue);

export default router;
