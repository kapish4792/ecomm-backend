import type { Request, Response } from 'express';
import prisma from '../lib/prisma.ts';
import { sendError, ErrorCode } from '../utils/errors.ts';
import { ErrorMessage } from '../utils/errorMessages.ts';

// ── Shared include for variant queries ───────────────────────────────────────
const variantInclude = {
  attributes: {
    include: {
      attributeValue: {
        include: { attribute: true },
      },
    },
  },
  product: {
    select: { id: true, name: true, slug: true },
  },
} as const;

// ── Helper: upsert attribute + attributeValue rows and return their IDs ──────
async function resolveAttributeValueIds(
  attrs: { name: string; value: string }[]
): Promise<string[]> {
  const ids: string[] = [];
  for (const attr of attrs) {
    const attribute = await prisma.attribute.upsert({
      where:  { name: attr.name },
      update: {},
      create: { name: attr.name },
    });
    const attrValue = await prisma.attributeValue.upsert({
      where:  { attributeId_value: { attributeId: attribute.id, value: attr.value } },
      update: {},
      create: { attributeId: attribute.id, value: attr.value },
    });
    ids.push(attrValue.id);
  }
  return ids;
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/variants
// Returns all variants across all products.
// ─────────────────────────────────────────────────────────────────────────────
export const getVariants = async (_req: Request, res: Response) => {
  try {
    const variants = await prisma.productVariant.findMany({
      include: variantInclude,
      orderBy: { createdAt: 'desc' },
    });
    return res.json({ success: true, data: variants });
  } catch (error) {
    console.error('Get all variants error:', error);
    return sendError(res, 500, ErrorCode.SERVER_ERROR, 'Failed to fetch variants');
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/products/:productId/variants
// Returns all variants for a specific product.
// ─────────────────────────────────────────────────────────────────────────────
export const getVariantsByProduct = async (req: Request, res: Response) => {
  const { productId } = req.params;
  try {
    const product = await prisma.product.findUnique({ where: { id: String(productId) } });
    if (!product || product.isDeleted) {
      return sendError(res, 404, ErrorCode.NOT_FOUND, ErrorMessage.PRODUCT_NOT_FOUND);
    }
    const variants = await prisma.productVariant.findMany({
      where:   { productId: String(productId) },
      include: variantInclude,
      orderBy: { createdAt: 'asc' },
    });
    return res.json({ success: true, data: variants });
  } catch (error) {
    console.error('Get variants by product error:', error);
    return sendError(res, 500, ErrorCode.SERVER_ERROR, 'Failed to fetch variants');
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/variants/:id
// Returns a single variant with resolved attribute values.
// ─────────────────────────────────────────────────────────────────────────────
export const getVariantById = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const variant = await prisma.productVariant.findUnique({
      where:   { id: String(id) },
      include: variantInclude,
    });
    if (!variant) {
      return sendError(res, 404, ErrorCode.NOT_FOUND, 'Variant not found');
    }
    return res.json({ success: true, data: variant });
  } catch (error) {
    console.error('Get variant by id error:', error);
    return sendError(res, 500, ErrorCode.SERVER_ERROR, 'Failed to fetch variant');
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/products/:productId/variants
// Adds a new variant (with EAV attributes) to an existing product.
// Body: { sku, price, stock, attributes: [{ name, value }] }
// ─────────────────────────────────────────────────────────────────────────────
export const createVariant = async (req: Request, res: Response) => {
  const { productId } = req.params;
  const { sku, price, stock, images, attributes } = req.body;

  try {
    const product = await prisma.product.findUnique({ where: { id: String(productId) } });
    if (!product || product.isDeleted) {
      return sendError(res, 404, ErrorCode.NOT_FOUND, ErrorMessage.PRODUCT_NOT_FOUND);
    }

    const attrValueIds = await resolveAttributeValueIds(attributes ?? []);

    const variant = await prisma.productVariant.create({
      data: {
        productId: String(productId),
        sku,
        price:   Number(price),
        stock:   stock ?? 0,
        images:  images ?? [],
        attributes: {
          create: attrValueIds.map((avId) => ({ attributeValueId: avId })),
        },
      },
      include: variantInclude,
    });

    return res.status(201).json({ success: true, data: variant });
  } catch (error: any) {
    console.error('Create variant error:', error);
    if (error?.code === 'P2002') {
      return sendError(res, 409, ErrorCode.CONFLICT, 'A variant with this SKU already exists');
    }
    return sendError(res, 500, ErrorCode.SERVER_ERROR, 'Failed to create variant');
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/variants/:id
// Updates a variant's sku, price, stock, and/or attributes.
// If `attributes` is provided it fully replaces the existing attribute set.
// Body: { sku?, price?, stock?, attributes?: [{ name, value }] }
// ─────────────────────────────────────────────────────────────────────────────
export const updateVariant = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { sku, price, stock, images, attributes } = req.body;

  try {
    const variant = await prisma.productVariant.findUnique({ where: { id: String(id) } });
    if (!variant) {
      return sendError(res, 404, ErrorCode.NOT_FOUND, 'Variant not found');
    }

    // If new attributes provided — resolve them, then replace junction rows
    if (attributes && attributes.length > 0) {
      const newAttrValueIds = await resolveAttributeValueIds(attributes);

      await prisma.$transaction(async (tx) => {
        // Delete existing junction rows
        await tx.variantAttributeValue.deleteMany({ where: { variantId: String(id) } });
        // Update variant scalar fields + re-create junction rows
        await tx.productVariant.update({
          where: { id: String(id) },
          data: {
            ...(sku      !== undefined && { sku }),
            ...(price    !== undefined && { price: Number(price) }),
            ...(stock    !== undefined && { stock }),
            ...(images !== undefined && { images }),
            attributes: {
              create: newAttrValueIds.map((avId) => ({ attributeValueId: avId })),
            },
          },
        });
      });
    } else {
      // No attribute change — just update scalar fields
      await prisma.productVariant.update({
        where: { id: String(id) },
        data: {
          ...(sku   !== undefined && { sku }),
          ...(price !== undefined && { price: Number(price) }),
          ...(stock !== undefined && { stock }),
          ...(images !== undefined && { images }),
        },
      });
    }

    const updated = await prisma.productVariant.findUnique({
      where:   { id: String(id) },
      include: variantInclude,
    });

    return res.json({ success: true, data: updated });
  } catch (error: any) {
    console.error('Update variant error:', error);
    if (error?.code === 'P2002') {
      return sendError(res, 409, ErrorCode.CONFLICT, 'A variant with this SKU already exists');
    }
    return sendError(res, 500, ErrorCode.SERVER_ERROR, 'Failed to update variant');
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/variants/:id
// Hard deletes the variant. Junction rows cascade automatically.
// ─────────────────────────────────────────────────────────────────────────────
export const deleteVariant = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const variant = await prisma.productVariant.findUnique({ where: { id: String(id) } });
    if (!variant) {
      return sendError(res, 404, ErrorCode.NOT_FOUND, 'Variant not found');
    }
    await prisma.productVariant.delete({ where: { id: String(id) } });
    return res.json({ success: true, message: 'Variant deleted successfully' });
  } catch (error) {
    console.error('Delete variant error:', error);
    return sendError(res, 500, ErrorCode.SERVER_ERROR, 'Failed to delete variant');
  }
};
