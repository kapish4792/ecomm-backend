import type { Request, Response } from 'express';
import prisma from '../lib/prisma.ts';
import { sendError, ErrorCode } from '../utils/errors.ts';
import { ErrorMessage } from '../utils/errorMessages.ts';

// Create a variant for a specific product
export const createVariant = async (req: Request, res: Response) => {
  const { productId } = req.params;
  const { sku, size, color, stock } = req.body;

  try {
    // Verify product exists
    const product = await prisma.product.findUnique({
      where: { id: String(productId) }
    });
    if (!product || product.isDeleted) {
      return sendError(res, 404, ErrorCode.NOT_FOUND, ErrorMessage.PRODUCT_NOT_FOUND);
    }

    const variant = await prisma.productVariant.create({
      data: {
        sku,
        size,
        color,
        stock,
        productId: String(productId)
      }
    });

    return res.status(201).json({ success: true, data: variant });
  } catch (error: any) {
    console.error("Create variant error:", error);
    return sendError(res, 500, ErrorCode.SERVER_ERROR, 'Failed to create variant');
  }
};

// Get all variants for a specific product
export const getVariantsByProduct = async (req: Request, res: Response) => {
  const { productId } = req.params;

  try {
    const product = await prisma.product.findUnique({
      where: { id: String(productId) }
    });
    if (!product || product.isDeleted) {
      return sendError(res, 404, ErrorCode.NOT_FOUND, ErrorMessage.PRODUCT_NOT_FOUND);
    }

    const variants = await prisma.productVariant.findMany({
      where: { productId: String(productId) }
    });

    return res.json({ success: true, data: variants });
  } catch (error) {
    console.error("Get variants error:", error);
    return sendError(res, 500, ErrorCode.SERVER_ERROR, 'Failed to fetch variants');
  }
};

// Get a single variant by ID
export const getVariantById = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const variant = await prisma.productVariant.findUnique({
      where: { id: String(id) }
    });
    if (!variant) {
      return sendError(res, 404, ErrorCode.NOT_FOUND, 'Variant not found');
    }

    return res.json({ success: true, data: variant });
  } catch (error) {
    console.error("Get variant by id error:", error);
    return sendError(res, 500, ErrorCode.SERVER_ERROR, 'Failed to fetch variant');
  }
};

// Update a variant by ID
export const updateVariant = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { sku, size, color, stock } = req.body;

  try {
    const variant = await prisma.productVariant.findUnique({
      where: { id: String(id) }
    });
    if (!variant) {
      return sendError(res, 404, ErrorCode.NOT_FOUND, 'Variant not found');
    }

    const updatedVariant = await prisma.productVariant.update({
      where: { id: String(id) },
      data: {
        sku,
        size,
        color,
        stock
      }
    });

    return res.json({ success: true, data: updatedVariant });
  } catch (error: any) {
    console.error("Update variant error:", error);
    return sendError(res, 500, ErrorCode.SERVER_ERROR, 'Failed to update variant');
  }
};

// Delete a variant by ID
export const deleteVariant = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const variant = await prisma.productVariant.findUnique({
      where: { id: String(id) }
    });
    if (!variant) {
      return sendError(res, 404, ErrorCode.NOT_FOUND, 'Variant not found');
    }

    await prisma.productVariant.delete({
      where: { id: String(id) }
    });

    return res.json({ success: true, message: 'Variant deleted successfully' });
  } catch (error) {
    console.error("Delete variant error:", error);
    return sendError(res, 500, ErrorCode.SERVER_ERROR, 'Failed to delete variant');
  }
};

// Get all variants across all products
export const getVariants = async (req: Request, res: Response) => {
  try {
    const variants = await prisma.productVariant.findMany();
    return res.json({ success: true, data: variants });
  } catch (error) {
    console.error("Get all variants error:", error);
    return sendError(res, 500, ErrorCode.SERVER_ERROR, 'Failed to fetch all variants');
  }
};

