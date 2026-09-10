import express from 'express';
import { protect } from '../middleware/auth.ts';
import { validate } from '../middleware/validate.ts';
import {
  createAddress,
  getAddresses,
  getAddressById,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
} from '../controllers/address.controller.ts';
import {
  CreateAddressSchema,
  UpdateAddressSchema,
  GetAddressSchema,
  DeleteAddressSchema,
  SetDefaultAddressSchema,
} from '../schemas/address.schema.ts';

// ─────────────────────────────────────────────────────────────────────────────
// USER ADDRESS ROUTES
// ─────────────────────────────────────────────────────────────────────────────

const router = express.Router();

// POST   /api/addresses          — Create new user address
router.post('/', protect, validate(CreateAddressSchema), createAddress);

// GET    /api/addresses          — List user addresses
router.get('/', protect, getAddresses);

// GET    /api/addresses/:id      — Get single user address by ID
router.get('/:id', protect, validate(GetAddressSchema), getAddressById);

// PUT    /api/addresses/:id      — Update user address by ID
router.put('/:id', protect, validate(UpdateAddressSchema), updateAddress);

// DELETE /api/addresses/:id      — Delete user address by ID
router.delete('/:id', protect, validate(DeleteAddressSchema), deleteAddress);

// PATCH  /api/addresses/:id/default — Set user address as primary default
router.patch('/:id/default', protect, validate(SetDefaultAddressSchema), setDefaultAddress);

export default router;
