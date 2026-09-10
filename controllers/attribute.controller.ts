import type { Request, Response } from 'express';
import prisma from '../lib/prisma.ts';
import { sendError, ErrorCode } from '../utils/errors.ts';

// ─────────────────────────────────────────────────────────────────────────────
// Attribute Admin API
// Manages global attribute names (e.g., "Color", "Size").
// Attribute values are created automatically during variant create/update.
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/attributes — list all attribute names with their values
export const getAttributes = async (_req: Request, res: Response) => {
  try {
    const attributes = await prisma.attribute.findMany({
      include: { values: { orderBy: { value: 'asc' } } },
      orderBy: { name: 'asc' },
    });
    return res.json({ success: true, data: attributes });
  } catch (error) {
    console.error('Get attributes error:', error);
    return sendError(res, 500, ErrorCode.SERVER_ERROR, 'Failed to fetch attributes');
  }
};

// POST /api/attributes — create a new attribute name
export const createAttribute = async (req: Request, res: Response) => {
  const { name } = req.body;
  try {
    const attribute = await prisma.attribute.upsert({
      where:  { name },
      update: {},
      create: { name },
      include: { values: true },
    });
    return res.status(201).json({ success: true, data: attribute });
  } catch (error) {
    console.error('Create attribute error:', error);
    return sendError(res, 500, ErrorCode.SERVER_ERROR, 'Failed to create attribute');
  }
};

// GET /api/attributes/:id/values — list all values for an attribute
export const getAttributeValues = async (req: Request, res: Response) => {
  const id = String(req.params.id);
  try {
    const attribute = await prisma.attribute.findUnique({
      where:   { id },
      include: { values: { orderBy: { value: 'asc' } } },
    });
    if (!attribute) {
      return sendError(res, 404, ErrorCode.NOT_FOUND, 'Attribute not found');
    }
    return res.json({ success: true, data: attribute });
  } catch (error) {
    console.error('Get attribute values error:', error);
    return sendError(res, 500, ErrorCode.SERVER_ERROR, 'Failed to fetch attribute values');
  }
};

// POST /api/attributes/:id/values — add a value to an attribute
export const createAttributeValue = async (req: Request, res: Response) => {
  const attributeId = String(req.params.id);
  const { value } = req.body;
  try {
    const attribute = await prisma.attribute.findUnique({ where: { id: attributeId } });
    if (!attribute) {
      return sendError(res, 404, ErrorCode.NOT_FOUND, 'Attribute not found');
    }

    const valuesToCreate = String(value)
      .split(',')
      .map((val) => val.trim())
      .filter((val) => val.length > 0);

    if (valuesToCreate.length === 0) {
      return sendError(res, 400, ErrorCode.VALIDATION_ERROR, 'Attribute value is required');
    }

    const createdValues = [];
    for (const val of valuesToCreate) {
      const attributeValue = await prisma.attributeValue.upsert({
        where: {
          attributeId_value: {
            attributeId,
            value: val,
          },
        },
        update: {},
        create: {
          attributeId,
          value: val,
        },
      });
      createdValues.push(attributeValue);
    }

    // Return array if multiple were passed, or single object if just one
    return res.status(201).json({
      success: true,
      data: createdValues.length === 1 ? createdValues[0] : createdValues,
    });
  } catch (error) {
    console.error('Create attribute value error:', error);
    return sendError(res, 500, ErrorCode.SERVER_ERROR, 'Failed to create attribute value');
  }
};

// DELETE /api/attributes/:id — delete attribute and all its values (cascades junction rows)
export const deleteAttribute = async (req: Request, res: Response) => {
  const id = String(req.params.id);
  try {
    const attribute = await prisma.attribute.findUnique({ where: { id } });
    if (!attribute) {
      return sendError(res, 404, ErrorCode.NOT_FOUND, 'Attribute not found');
    }
    await prisma.attribute.delete({ where: { id } });
    return res.json({ success: true, message: `Attribute "${attribute.name}" and all its values deleted` });
  } catch (error) {
    console.error('Delete attribute error:', error);
    return sendError(res, 500, ErrorCode.SERVER_ERROR, 'Failed to delete attribute');
  }
};

// DELETE /api/attributes/values/:id — delete a specific attribute value
export const deleteAttributeValue = async (req: Request, res: Response) => {
  const id = String(req.params.id);
  try {
    const attributeValue = await prisma.attributeValue.findUnique({ where: { id } });
    if (!attributeValue) {
      return sendError(res, 404, ErrorCode.NOT_FOUND, 'Attribute value not found');
    }
    await prisma.attributeValue.delete({ where: { id } });
    return res.json({ success: true, message: `Attribute value "${attributeValue.value}" deleted successfully` });
  } catch (error) {
    console.error('Delete attribute value error:', error);
    return sendError(res, 500, ErrorCode.SERVER_ERROR, 'Failed to delete attribute value');
  }
};
