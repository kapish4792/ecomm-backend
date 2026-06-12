import express from 'express';
import { protect, authorize } from '../middleware/auth.ts';
import {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct
} from '../controllers/product.controller.ts';
import { validate } from '../middleware/validate.ts';
import {
  CreateProductSchema,
  UpdateProductSchema,
  DeleteProductSchema,
  GetProductByIdSchema,
} from '../schemas/product.schema.ts';

const router = express.Router();

// Get all products
router.get("/", getProducts);

// Get a single product by ID
router.get("/:id", validate(GetProductByIdSchema), getProductById);

// Create product (protected, admin/superadmin only)
router.post("/", protect, authorize(["ADMIN", "SUPERADMIN"]), validate(CreateProductSchema), createProduct);

// Update product (protected, admin/superadmin only)
router.put("/:id", protect, authorize(["ADMIN", "SUPERADMIN"]), validate(UpdateProductSchema), updateProduct);

// Delete product (protected, admin/superadmin only)
router.delete("/:id", protect, authorize(["ADMIN", "SUPERADMIN"]), validate(DeleteProductSchema), deleteProduct);

export default router;
