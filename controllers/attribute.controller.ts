import type { Request, Response } from 'express';
import prisma from '../lib/prisma.ts';
import { sendError, ErrorCode } from '../utils/errors.ts';
import { ErrorMessage } from '../utils/errorMessages.ts';

// Create an attribute globally (or return existing if duplicate key/value)
export const createAttribute = async (req: Request, res: Response) => {
  const { key, value } = req.body;

  try {
    const attribute = await prisma.attribute.upsert({
      where: {
        key_value: { key, value }
      },
      update: {},
      create: { key, value }
    });

    return res.status(201).json({ success: true, data: attribute });
  } catch (error) {
    console.error("Create attribute error:", error);
    return sendError(res, 500, ErrorCode.SERVER_ERROR, 'Failed to create attribute');
  }
};

// Get all global attributes
export const getAttributes = async (req: Request, res: Response) => {
  try {
    const attributes = await prisma.attribute.findMany();
    return res.json({ success: true, data: attributes });
  } catch (error) {
    console.error("Get all attributes error:", error);
    return sendError(res, 500, ErrorCode.SERVER_ERROR, 'Failed to fetch all attributes');
  }
};

// Get all attributes for a specific product
export const getAttributesByProduct = async (req: Request, res: Response) => {
  const { productId } = req.params;

  try {
    const product = await prisma.product.findUnique({
      where: { id: String(productId) },
      include: { attributes: true }
    });
    if (!product || product.isDeleted) {
      return sendError(res, 404, ErrorCode.NOT_FOUND, ErrorMessage.PRODUCT_NOT_FOUND);
    }

    return res.json({ success: true, data: product.attributes });
  } catch (error) {
    console.error("Get attributes by product error:", error);
    return sendError(res, 500, ErrorCode.SERVER_ERROR, 'Failed to fetch product attributes');
  }
};

// Get a single global attribute by ID
export const getAttributeById = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const attribute = await prisma.attribute.findUnique({
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

// Update a global attribute's key/value by ID
export const updateAttribute = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { key, value } = req.body;

  try {
    const attribute = await prisma.attribute.findUnique({
      where: { id: String(id) }
    });
    if (!attribute) {
      return sendError(res, 404, ErrorCode.NOT_FOUND, 'Attribute not found');
    }

    const updatedAttribute = await prisma.attribute.update({
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
        `An attribute with the combination key "${key}" and value "${value}" already exists.`
      );
    }
    return sendError(res, 500, ErrorCode.SERVER_ERROR, 'Failed to update attribute');
  }
};

// Delete a global attribute completely
export const deleteAttribute = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const attribute = await prisma.attribute.findUnique({
      where: { id: String(id) }
    });
    if (!attribute) {
      return sendError(res, 404, ErrorCode.NOT_FOUND, 'Attribute not found');
    }

    await prisma.attribute.delete({
      where: { id: String(id) }
    });

    return res.json({ success: true, message: 'Attribute deleted successfully' });
  } catch (error) {
    console.error("Delete attribute error:", error);
    return sendError(res, 500, ErrorCode.SERVER_ERROR, 'Failed to delete attribute');
  }
};

// Link an attribute (creates it globally if it doesn't exist) to a product
export const linkAttribute = async (req: Request, res: Response) => {
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

    // Upsert the global attribute
    const attribute = await prisma.attribute.upsert({
      where: {
        key_value: { key, value }
      },
      update: {},
      create: { key, value }
    });

    // Link it to the product
    await prisma.product.update({
      where: { id: String(productId) },
      data: {
        attributes: {
          connect: { id: attribute.id }
        }
      }
    });

    return res.json({ success: true, data: attribute });
  } catch (error) {
    console.error("Link attribute error:", error);
    return sendError(res, 500, ErrorCode.SERVER_ERROR, 'Failed to link attribute to product');
  }
};

// Disconnect/Unlink an attribute from a product
export const unlinkAttribute = async (req: Request, res: Response) => {
  const { productId, attributeId } = req.params;

  try {
    // Verify product exists
    const product = await prisma.product.findUnique({
      where: { id: String(productId) }
    });
    if (!product || product.isDeleted) {
      return sendError(res, 404, ErrorCode.NOT_FOUND, ErrorMessage.PRODUCT_NOT_FOUND);
    }

    await prisma.product.update({
      where: { id: String(productId) },
      data: {
        attributes: {
          disconnect: { id: String(attributeId) }
        }
      }
    });

    return res.json({ success: true, message: 'Attribute disconnected from product successfully' });
  } catch (error) {
    console.error("Unlink attribute error:", error);
    return sendError(res, 500, ErrorCode.SERVER_ERROR, 'Failed to unlink attribute');
  }
};
