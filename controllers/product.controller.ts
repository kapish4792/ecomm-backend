import type { Request, Response } from 'express';
import prisma from '../lib/prisma.ts';
import { sendError, ErrorCode } from '../utils/errors.ts';
import { ErrorMessage } from '../utils/errorMessages.ts';

// ── Helper: resolve (or create) attribute values for a variant ───────────────
// Given [{ name: "Color", value: "Red" }, ...], upserts Attribute + AttributeValue
// rows and returns an array of attributeValueId integers.
async function resolveAttributeValueIds(
  attrs: { name: string; value: string }[]
): Promise<string[]> {
  const ids: string[] = [];
  for (const attr of attrs) {
    const attribute = await prisma.attribute.upsert({
      where: { name: attr.name },
      update: {},
      create: { name: attr.name },
    });
    const attrValue = await prisma.attributeValue.upsert({
      where: { attributeId_value: { attributeId: attribute.id, value: attr.value } },
      update: {},
      create: { attributeId: attribute.id, value: attr.value },
    });
    ids.push(attrValue.id);
  }
  return ids;
}

// ── Prisma include shape reused across all product queries ───────────────────
const productInclude = {
  categories: {
    where: { isActive: true },
  },
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
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/products
// Creates a product with all variants and their EAV attribute values.
// Body: { name, basePrice, category, description, imageUrl?, images?, status?, variants[] }
// ─────────────────────────────────────────────────────────────────────────────
export const createProduct = async (req: Request, res: Response) => {
  try {
    const {
      name, basePrice, category, displayCategory,
      imageUrl, images, description, status, variants,
      categories,
    } = req.body;

    // Generate unique slug
    const baseSlug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'product';
    const existingSlugs = (await prisma.product.findMany({
      where: { slug: { startsWith: baseSlug } },
      select: { slug: true },
    })).map((p) => p.slug);

    let slug = baseSlug;
    if (existingSlugs.includes(baseSlug)) {
      let count = 1;
      while (existingSlugs.includes(`${baseSlug}-${count}`)) count++;
      slug = `${baseSlug}-${count}`;
    }

    // Resolve categories
    const categoryInputs: string[] = [];
    if (Array.isArray(categories)) {
      categoryInputs.push(...categories.map((c) => String(c).trim()));
    } else if (category) {
      categoryInputs.push(String(category).trim());
    }

    const dbCategories = await prisma.category.findMany({
      where: {
        slug: { in: categoryInputs },
      },
    });

    const primaryCategory = dbCategories[0]?.slug || categoryInputs[0] || '';

    // Resolve all attribute values up front (outside transaction to avoid long lock)
    const resolvedVariants: { sku: string; price: number; stock: number; images: string[]; attrValueIds: string[] }[] = [];
    for (const v of variants) {
      const attrValueIds = await resolveAttributeValueIds(v.attributes ?? []);
      resolvedVariants.push({
        sku: v.sku,
        price: Number(v.price),
        stock: v.stock ?? 0,
        images: v.images ?? [],
        attrValueIds,
      });
    }

    // Create product + variants + junction rows in one transaction
    const product = await prisma.$transaction(async (tx) => {
      const created = await tx.product.create({
        data: {
          name,
          slug,
          basePrice: Number(basePrice),
          category: primaryCategory,
          displayCategory: displayCategory ?? null,
          imageUrl: imageUrl ?? '',
          images: images ?? [],
          description,
          status: status ?? 'DRAFT',
          categories: {
            connect: dbCategories.map((cat) => ({ id: cat.id })),
          },
          variants: {
            create: resolvedVariants.map((v) => ({
              sku: v.sku,
              price: v.price,
              stock: v.stock,
              images: v.images,
              attributes: {
                create: v.attrValueIds.map((avId) => ({ attributeValueId: avId })),
              },
            })),
          },
        },
        include: productInclude,
      });
      return created;
    });

    return res.status(201).json({ success: true, data: product });
  } catch (error: any) {
    console.error('Create product error:', error);
    if (error?.code === 'P2002') {
      return sendError(res, 400, ErrorCode.CONFLICT, ErrorMessage.PRODUCT_ALREADY_EXISTS, {
        target: error.meta?.target || ['slug'],
      });
    }
    return sendError(res, 500, ErrorCode.SERVER_ERROR, ErrorMessage.CREATE_PRODUCT_FAILED);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/products
// Returns all PUBLISHED, non-deleted products with variants and resolved attributes.
// ─────────────────────────────────────────────────────────────────────────────
export const getProducts = async (_req: Request, res: Response) => {
  const { page, limit } = _req.query as any;
  const pageNum = Number(page) || 1;
  const limitNum = Number(limit) || 10;
  const skip = (pageNum - 1) * limitNum;
  const take = limitNum;

  const where = { isDeleted: false };

  try {
    const [products, total] = await prisma.$transaction([
      prisma.product.findMany({
        where,
        skip,
        take,
        include: productInclude,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.product.count({ where }),
    ]);

    return res.json({
      success: true,
      data: products,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
        hasNext: skip + take < total,
      },
    });
  } catch (error) {
    console.error('Get products error:', error);
    return sendError(res, 500, ErrorCode.SERVER_ERROR, ErrorMessage.FETCH_PRODUCTS_FAILED);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/products/:id
// Returns a single product (any status, for admins to preview drafts).
// ─────────────────────────────────────────────────────────────────────────────
export const getProductById = async (req: Request, res: Response) => {
  const id = req.params.id as string;
  try {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    const product = await prisma.product.findFirst({
      where: {
        isDeleted: false,
        OR: [
          isUuid ? { id: String(id) } : undefined,
          { slug: String(id) }
        ].filter(Boolean) as any
      },
      include: productInclude,
    });
    if (!product) {
      return sendError(res, 404, ErrorCode.NOT_FOUND, ErrorMessage.PRODUCT_NOT_FOUND);
    }
    return res.json({ success: true, data: product });
  } catch (error) {
    console.error('Get product by id error:', error);
    return sendError(res, 500, ErrorCode.SERVER_ERROR, ErrorMessage.FETCH_PRODUCTS_FAILED);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/products/:id
// Updates core product fields only. Variants are managed via /variants endpoints.
// Body: { name?, basePrice?, category?, displayCategory?, imageUrl?, images?, description?, status? }
// ─────────────────────────────────────────────────────────────────────────────
export const updateProduct = async (req: Request, res: Response) => {
  const id = req.params.id as string;
  try {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    const product = await prisma.product.findFirst({
      where: {
        isDeleted: false,
        OR: [
          isUuid ? { id: String(id) } : undefined,
          { slug: String(id) }
        ].filter(Boolean) as any
      }
    });
    if (!product) {
      return sendError(res, 404, ErrorCode.NOT_FOUND, ErrorMessage.PRODUCT_NOT_FOUND);
    }

    const { name, basePrice, category, displayCategory, imageUrl, images, description, status, categories } = req.body;

    // Regenerate slug if name changed
    let slug = product.slug;
    if (name && name !== product.name) {
      const baseSlug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      const existing = (await prisma.product.findMany({
        where: { slug: { startsWith: baseSlug }, id: { not: product.id } },
        select: { slug: true },
      })).map((p) => p.slug);
      slug = baseSlug;
      if (existing.includes(baseSlug)) {
        let count = 1;
        while (existing.includes(`${baseSlug}-${count}`)) count++;
        slug = `${baseSlug}-${count}`;
      }
    }

    let categoryUpdateData = {};
    if (categories !== undefined || category !== undefined) {
      const categoryInputs: string[] = [];
      if (Array.isArray(categories)) {
        categoryInputs.push(...categories.map((c) => String(c).trim()));
      } else if (category) {
        categoryInputs.push(String(category).trim());
      }

      const dbCategories = await prisma.category.findMany({
        where: {
          slug: { in: categoryInputs },
        },
      });

      categoryUpdateData = {
        category: dbCategories[0]?.slug || categoryInputs[0] || '',
        categories: {
          set: dbCategories.map((cat) => ({ id: cat.id })),
        },
      };
    }

    const updated = await prisma.product.update({
      where: { id: product.id },
      data: {
        ...(name !== undefined && { name, slug }),
        ...(basePrice !== undefined && { basePrice: Number(basePrice) }),
        ...categoryUpdateData,
        ...(displayCategory !== undefined && { displayCategory }),
        ...(imageUrl !== undefined && { imageUrl }),
        ...(images !== undefined && { images }),
        ...(description !== undefined && { description }),
        ...(status !== undefined && { status }),
      },
      include: productInclude,
    });
    return res.json({ success: true, data: updated });
  } catch (error: any) {
    console.error('Update product error:', error);
    if (error?.code === 'P2002') {
      return sendError(res, 400, ErrorCode.CONFLICT, ErrorMessage.PRODUCT_ALREADY_EXISTS, {
        target: error.meta?.target || ['slug'],
      });
    }
    return sendError(res, 500, ErrorCode.SERVER_ERROR, ErrorMessage.UPDATE_PRODUCT_FAILED);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/products/:id
// Soft delete — sets isDeleted: true.
// ─────────────────────────────────────────────────────────────────────────────
export const deleteProduct = async (req: Request, res: Response) => {
  const id = req.params.id as string;
  try {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    const product = await prisma.product.findFirst({
      where: {
        isDeleted: false,
        OR: [
          isUuid ? { id: String(id) } : undefined,
          { slug: String(id) }
        ].filter(Boolean) as any
      }
    });
    if (!product) {
      return sendError(res, 404, ErrorCode.NOT_FOUND, ErrorMessage.PRODUCT_NOT_FOUND);
    }
    await prisma.product.update({ where: { id: product.id }, data: { isDeleted: true } });
    return res.status(200).json({ success: true, message: ErrorMessage.PRODUCT_DELETED });
  } catch (error) {
    console.error('Delete product error:', error);
    return sendError(res, 500, ErrorCode.SERVER_ERROR, ErrorMessage.DELETE_PRODUCT_FAILED);
  }
};