import express from 'express';
import { protect, authorize } from '../middleware/auth.ts';
import { validate } from '../middleware/validate.ts';
import {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct,
} from '../controllers/product.controller.ts';
import {
  CreateProductSchema,
  UpdateProductSchema,
  DeleteProductSchema,
  GetProductByIdSchema,
} from '../schemas/product.schema.ts';

const router = express.Router();

// GET /api/products — list all PUBLISHED products
router.get('/', getProducts);

// GET /api/products/:id — get single product (any status, for admin preview)
router.get('/:id', validate(GetProductByIdSchema), getProductById);

// POST /api/products — create product + variants (ADMIN/SUPERADMIN only)
router.post('/', protect, authorize(['ADMIN', 'SUPERADMIN']), validate(CreateProductSchema), createProduct);

// PUT /api/products/:id — update product fields or status (ADMIN/SUPERADMIN only)
router.put('/:id', protect, authorize(['ADMIN', 'SUPERADMIN']), validate(UpdateProductSchema), updateProduct);

// DELETE /api/products/:id — soft delete (ADMIN/SUPERADMIN only)
router.delete('/:id', protect, authorize(['ADMIN', 'SUPERADMIN']), validate(DeleteProductSchema), deleteProduct);

export default router;
