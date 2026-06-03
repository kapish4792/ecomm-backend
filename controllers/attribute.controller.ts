import type { Request, Response } from 'express';
import prisma from '../lib/prisma.ts';
import { sendError, ErrorCode } from '../utils/errors.ts';
import { ErrorMessage } from '../utils/errorMessages.ts';

// Create an attribute for a specific product
export const createAttribute = async (req: Request, res: Response) => {
  const { productId } = req.params;
  const { key, value } = req.body;

  try {
    // Verify product exists
    const product = await prisma.product.findUnique({
      where: { id: String(productId) }
    });
    if (!product || product.isDeleted) {
      return sendError(res, 404, ErrorCode.NOT_FOUND, ErrorMessage.PRODUCT_NOT_FOUND);
    }

    const attribute = await prisma.productAttribute.create({
      data: {
        key,
        value,
        productId: String(productId)
      }
    });

    return res.status(201).json({ success: true, data: attribute });
  } catch (error: any) {
    console.error("Create attribute error:", error);
    if (error?.code === 'P2002') {
      return sendError(
        res,
        400,
        ErrorCode.CONFLICT,
        `An attribute with the key "${key}" already exists for this product.`
      );
    }
    return sendError(res, 500, ErrorCode.SERVER_ERROR, 'Failed to create attribute');
  }
};

// Get all attributes for a specific product
export const getAttributesByProduct = async (req: Request, res: Response) => {
  const { productId } = req.params;

  try {
    const product = await prisma.product.findUnique({
      where: { id: String(productId) }
    });
    if (!product || product.isDeleted) {
      return sendError(res, 404, ErrorCode.NOT_FOUND, ErrorMessage.PRODUCT_NOT_FOUND);
    }

    const attributes = await prisma.productAttribute.findMany({
      where: { productId: String(productId) }
    });

    return res.json({ success: true, data: attributes });
  } catch (error) {
    console.error("Get attributes error:", error);
    return sendError(res, 500, ErrorCode.SERVER_ERROR, 'Failed to fetch attributes');
  }
};

// Get a single attribute by ID
export const getAttributeById = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const attribute = await prisma.productAttribute.findUnique({
      where: { id: String(id) }
    });
    if (!attribute) {
      return sendError(res, 404, ErrorCode.NOT_FOUND, 'Attribute not found');
    }

    return res.json({ success: true, data: attribute });
  } catch (error) {
    console.error("Get attribute by id error:", error);
    return sendError(res, 500, ErrorCode.SERVER_ERROR, 'Failed to fetch attribute');
  }
};

// Update an attribute by ID
export const updateAttribute = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { key, value } = req.body;

  try {
    const attribute = await prisma.productAttribute.findUnique({
      where: { id: String(id) }
    });
    if (!attribute) {
      return sendError(res, 404, ErrorCode.NOT_FOUND, 'Attribute not found');
    }

    const updatedAttribute = await prisma.productAttribute.update({
      where: { id: String(id) },
      data: {
        key,
        value
      }
    });

    return res.json({ success: true, data: updatedAttribute });
  } catch (error: any) {
    console.error("Update attribute error:", error);
    if (error?.code === 'P2002') {
      return sendError(
        res,
        400,
        ErrorCode.CONFLICT,
        `An attribute with the key "${key}" already exists for this product.`
      );
    }
    return sendError(res, 500, ErrorCode.SERVER_ERROR, 'Failed to update attribute');
  }
};

// Delete an attribute by ID
export const deleteAttribute = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const attribute = await prisma.productAttribute.findUnique({
      where: { id: String(id) }
    });
    if (!attribute) {
      return sendError(res, 404, ErrorCode.NOT_FOUND, 'Attribute not found');
    }

    await prisma.productAttribute.delete({
      where: { id: String(id) }
    });

    return res.json({ success: true, message: 'Attribute deleted successfully' });
  } catch (error) {
    console.error("Delete attribute error:", error);
    return sendError(res, 500, ErrorCode.SERVER_ERROR, 'Failed to delete attribute');
  }
};

// Get all attributes across all products
export const getAttributes = async (req: Request, res: Response) => {
  try {
    const attributes = await prisma.productAttribute.findMany();
    return res.json({ success: true, data: attributes });
  } catch (error) {
    console.error("Get all attributes error:", error);
    return sendError(res, 500, ErrorCode.SERVER_ERROR, 'Failed to fetch all attributes');
  }
};

