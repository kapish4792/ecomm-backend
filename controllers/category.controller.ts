import type { Request, Response } from 'express';
import prisma from '../lib/prisma.ts';
import { sendError, ErrorCode } from '../utils/errors.ts';
import { ErrorMessage } from '../utils/errorMessages.ts';

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/categories
// Returns paginated categories. Optional query filter for isActive.
// ─────────────────────────────────────────────────────────────────────────────
export const listCategories = async (req: Request, res: Response) => {
  try {
    const { page, limit, isActive } = req.query as any;
    const skip = (Number(page) - 1) * Number(limit);
    const take = Number(limit);

    const where: any = {};
    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    const [categories, total] = await prisma.$transaction([
      prisma.category.findMany({
        where,
        skip,
        take,
        include: {
          _count: { select: { products: true } },
        },
        orderBy: { name: 'asc' },
      }),
      prisma.category.count({ where }),
    ]);

    return res.json({
      success: true,
      data: categories,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
        hasNext: skip + take < total,
      },
    });
  } catch (error) {
    console.error('List categories error:', error);
    return sendError(res, 500, ErrorCode.SERVER_ERROR, ErrorMessage.FETCH_CATEGORIES_FAILED);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/categories/:id
// Returns a single category.
// ─────────────────────────────────────────────────────────────────────────────
export const getCategoryById = async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  try {
    const category = await prisma.category.findUnique({
      where: { id },
      include: {
        _count: { select: { products: true } },
      },
    });
    if (!category) {
      return sendError(res, 404, ErrorCode.NOT_FOUND, ErrorMessage.CATEGORY_NOT_FOUND);
    }
    return res.json({ success: true, data: category });
  } catch (error) {
    console.error('Get category error:', error);
    return sendError(res, 500, ErrorCode.SERVER_ERROR, ErrorMessage.FETCH_CATEGORIES_FAILED);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/categories/:id/products
// Returns products belonging to this category.
// ─────────────────────────────────────────────────────────────────────────────
export const getCategoryProducts = async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  try {
    const category = await prisma.category.findUnique({ where: { id } });
    if (!category) {
      return sendError(res, 404, ErrorCode.NOT_FOUND, ErrorMessage.CATEGORY_NOT_FOUND);
    }

    const { page, limit } = req.query as any;
    const skip = (Number(page) - 1) * Number(limit);
    const take = Number(limit);

    const where = { categoryId: id, isDeleted: false, status: 'PUBLISHED' as const };

    const [products, total] = await prisma.$transaction([
      prisma.product.findMany({
        where,
        skip,
        take,
        include: {
          variants: {
            include: {
              attributes: {
                include: {
                  attributeValue: {
                    include: { attribute: true },
                  },
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.product.count({ where }),
    ]);

    return res.json({
      success: true,
      data: products,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
        hasNext: skip + take < total,
      },
    });
  } catch (error) {
    console.error('Get category products error:', error);
    return sendError(res, 500, ErrorCode.SERVER_ERROR, ErrorMessage.FETCH_PRODUCTS_FAILED);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/categories
// Creates a new category. Generates unique slug.
// ─────────────────────────────────────────────────────────────────────────────
export const createCategory = async (req: Request, res: Response) => {
  try {
    const { name, description, imageUrl, isActive } = req.body;

    // Generate unique slug
    const baseSlug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'category';
    const existingSlugs = (await prisma.category.findMany({
      where: { slug: { startsWith: baseSlug } },
      select: { slug: true },
    })).map((c) => c.slug);

    let slug = baseSlug;
    if (existingSlugs.includes(baseSlug)) {
      let count = 1;
      while (existingSlugs.includes(`${baseSlug}-${count}`)) count++;
      slug = `${baseSlug}-${count}`;
    }

    const category = await prisma.category.create({
      data: {
        name,
        slug,
        description: description ?? null,
        imageUrl: imageUrl ?? null,
        isActive: isActive ?? true,
      },
    });

    return res.status(201).json({ success: true, data: category });
  } catch (error: any) {
    console.error('Create category error:', error);
    if (error?.code === 'P2002') {
      return sendError(res, 400, ErrorCode.CONFLICT, ErrorMessage.CATEGORY_ALREADY_EXISTS);
    }
    return sendError(res, 500, ErrorCode.SERVER_ERROR, ErrorMessage.CREATE_CATEGORY_FAILED);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/categories/:id
// Updates a category's details.
// ─────────────────────────────────────────────────────────────────────────────
export const updateCategory = async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  try {
    const category = await prisma.category.findUnique({ where: { id } });
    if (!category) {
      return sendError(res, 404, ErrorCode.NOT_FOUND, ErrorMessage.CATEGORY_NOT_FOUND);
    }

    const { name, description, imageUrl, isActive } = req.body;

    let slug = category.slug;
    if (name && name !== category.name) {
      const baseSlug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      const existing = (await prisma.category.findMany({
        where: { slug: { startsWith: baseSlug }, id: { not: id } },
        select: { slug: true },
      })).map((c) => c.slug);

      slug = baseSlug;
      if (existing.includes(baseSlug)) {
        let count = 1;
        while (existing.includes(`${baseSlug}-${count}`)) count++;
        slug = `${baseSlug}-${count}`;
      }
    }

    const updated = await prisma.category.update({
      where: { id },
      data: {
        ...(name !== undefined && { name, slug }),
        ...(description !== undefined && { description }),
        ...(imageUrl !== undefined && { imageUrl }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    return res.json({ success: true, data: updated });
  } catch (error: any) {
    console.error('Update category error:', error);
    if (error?.code === 'P2002') {
      return sendError(res, 400, ErrorCode.CONFLICT, ErrorMessage.CATEGORY_ALREADY_EXISTS);
    }
    return sendError(res, 500, ErrorCode.SERVER_ERROR, ErrorMessage.UPDATE_CATEGORY_FAILED);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/categories/:id
// Soft delete category (sets isActive to false)
// ─────────────────────────────────────────────────────────────────────────────
export const deleteCategory = async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  try {
    const category = await prisma.category.findUnique({ where: { id } });
    if (!category) {
      return sendError(res, 404, ErrorCode.NOT_FOUND, ErrorMessage.CATEGORY_NOT_FOUND);
    }

    await prisma.category.update({
      where: { id },
      data: { isActive: false },
    });

    return res.json({ success: true, message: ErrorMessage.CATEGORY_DELETED });
  } catch (error) {
    console.error('Delete category error:', error);
    return sendError(res, 500, ErrorCode.SERVER_ERROR, ErrorMessage.DELETE_CATEGORY_FAILED);
  }
};
