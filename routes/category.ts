import express from 'express';
import { protect, authorize } from '../middleware/auth.ts';
import { validate } from '../middleware/validate.ts';
import {
  listCategories,
  getCategoryById,
  getCategoryProducts,
  createCategory,
  updateCategory,
  deleteCategory,
} from '../controllers/category.controller.ts';
import {
  CreateCategorySchema,
  UpdateCategorySchema,
  DeleteCategorySchema,
  GetCategorySchema,
  GetCategoryProductsSchema,
  ListCategoriesSchema,
} from '../schemas/category.schema.ts';

const router = express.Router();

// GET /api/categories — list categories
router.get('/', validate(ListCategoriesSchema), listCategories);

// GET /api/categories/:id — get category details
router.get('/:id', validate(GetCategorySchema), getCategoryById);

// GET /api/categories/:id/products — get products belonging to a category
router.get('/:id/products', validate(GetCategoryProductsSchema), getCategoryProducts);

// POST /api/categories — create a category (ADMIN/SUPERADMIN only)
router.post('/', protect, authorize(['ADMIN', 'SUPERADMIN']), validate(CreateCategorySchema), createCategory);

// PUT /api/categories/:id — update a category (ADMIN/SUPERADMIN only)
router.put('/:id', protect, authorize(['ADMIN', 'SUPERADMIN']), validate(UpdateCategorySchema), updateCategory);

// DELETE /api/categories/:id — soft delete a category (ADMIN/SUPERADMIN only)
router.delete('/:id', protect, authorize(['ADMIN', 'SUPERADMIN']), validate(DeleteCategorySchema), deleteCategory);

export default router;
