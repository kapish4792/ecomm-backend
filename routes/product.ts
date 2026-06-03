import express from 'express';
import { protect } from '../middleware/auth.ts';
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

// Create product (protected, admin only in real scenario, but applying standard protect middleware here)
router.post("/", protect, validate(CreateProductSchema), createProduct);

// Update product
router.put("/:id", protect, validate(UpdateProductSchema), updateProduct);

// Delete product
router.delete("/:id", protect, validate(DeleteProductSchema), deleteProduct);

export default router;
