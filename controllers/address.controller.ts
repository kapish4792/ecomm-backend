import type { Request, Response } from 'express';
import prisma from '../lib/prisma.ts';
import { sendError, ErrorCode } from '../utils/errors.ts';

// ─────────────────────────────────────────────────────────────────────────────
// USER ADDRESS CONTROLLER — Complete CRUD for User Address Book
// ─────────────────────────────────────────────────────────────────────────────

// POST /api/addresses — Create new address for logged-in user
export const createAddress = async (req: Request, res: Response) => {
  const userId = (req as any).user?.userId;
  if (!userId) {
    return sendError(res, 401, ErrorCode.UNAUTHORIZED, 'Unauthorized');
  }

  const {
    fullName,
    phone,
    addressLine1,
    addressLine2,
    landmark,
    city,
    state,
    country,
    postalCode,
    type,
    isDefault,
  } = req.body;

  try {
    const existingCount = await prisma.address.count({
      where: { user_id: userId },
    });

    // First address is automatically default
    const shouldBeDefault = existingCount === 0 || Boolean(isDefault);

    const address = await prisma.$transaction(async (tx) => {
      if (shouldBeDefault) {
        await tx.address.updateMany({
          where: { user_id: userId },
          data: { isDefault: false },
        });
      }

      return tx.address.create({
        data: {
          user_id: userId,
          fullName,
          phone,
          addressLine1,
          addressLine2,
          landmark,
          city,
          state,
          country,
          postalCode,
          type: type || 'HOME',
          isDefault: shouldBeDefault,
        },
      });
    });

    return res.status(201).json({ success: true, data: address });
  } catch (error) {
    console.error('Create address error:', error);
    return sendError(res, 500, ErrorCode.SERVER_ERROR, 'Failed to create address');
  }
};

// GET /api/addresses — List all addresses for logged-in user
export const getAddresses = async (req: Request, res: Response) => {
  const userId = (req as any).user?.userId;
  if (!userId) {
    return sendError(res, 401, ErrorCode.UNAUTHORIZED, 'Unauthorized');
  }

  try {
    const addresses = await prisma.address.findMany({
      where: { user_id: userId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });

    return res.json({ success: true, data: addresses });
  } catch (error) {
    console.error('Get addresses error:', error);
    return sendError(res, 500, ErrorCode.SERVER_ERROR, 'Failed to fetch addresses');
  }
};

// GET /api/addresses/:id — Get single address by ID
export const getAddressById = async (req: Request, res: Response) => {
  const userId = (req as any).user?.userId;
  const id = String(req.params.id);

  if (!userId) {
    return sendError(res, 401, ErrorCode.UNAUTHORIZED, 'Unauthorized');
  }

  try {
    const address = await prisma.address.findFirst({
      where: { id, user_id: userId },
    });

    if (!address) {
      return sendError(res, 404, ErrorCode.NOT_FOUND, 'Address not found');
    }

    return res.json({ success: true, data: address });
  } catch (error) {
    console.error('Get address by ID error:', error);
    return sendError(res, 500, ErrorCode.SERVER_ERROR, 'Failed to fetch address');
  }
};

// PUT /api/addresses/:id — Update existing address
export const updateAddress = async (req: Request, res: Response) => {
  const userId = (req as any).user?.userId;
  const id = String(req.params.id);

  if (!userId) {
    return sendError(res, 401, ErrorCode.UNAUTHORIZED, 'Unauthorized');
  }

  try {
    const existing = await prisma.address.findFirst({
      where: { id, user_id: userId },
    });

    if (!existing) {
      return sendError(res, 404, ErrorCode.NOT_FOUND, 'Address not found');
    }

    const {
      fullName,
      phone,
      addressLine1,
      addressLine2,
      landmark,
      city,
      state,
      country,
      postalCode,
      type,
      isDefault,
    } = req.body;

    const updatedAddress = await prisma.$transaction(async (tx) => {
      if (isDefault === true) {
        await tx.address.updateMany({
          where: { user_id: userId },
          data: { isDefault: false },
        });
      }

      return tx.address.update({
        where: { id },
        data: {
          ...(fullName !== undefined && { fullName }),
          ...(phone !== undefined && { phone }),
          ...(addressLine1 !== undefined && { addressLine1 }),
          ...(addressLine2 !== undefined && { addressLine2 }),
          ...(landmark !== undefined && { landmark }),
          ...(city !== undefined && { city }),
          ...(state !== undefined && { state }),
          ...(country !== undefined && { country }),
          ...(postalCode !== undefined && { postalCode }),
          ...(type !== undefined && { type }),
          ...(isDefault !== undefined && { isDefault }),
        },
      });
    });

    return res.json({ success: true, data: updatedAddress });
  } catch (error) {
    console.error('Update address error:', error);
    return sendError(res, 500, ErrorCode.SERVER_ERROR, 'Failed to update address');
  }
};

// DELETE /api/addresses/:id — Delete address by ID
export const deleteAddress = async (req: Request, res: Response) => {
  const userId = (req as any).user?.userId;
  const id = String(req.params.id);

  if (!userId) {
    return sendError(res, 401, ErrorCode.UNAUTHORIZED, 'Unauthorized');
  }

  try {
    const existing = await prisma.address.findFirst({
      where: { id, user_id: userId },
    });

    if (!existing) {
      return sendError(res, 404, ErrorCode.NOT_FOUND, 'Address not found');
    }

    await prisma.$transaction(async (tx) => {
      await tx.address.delete({
        where: { id },
      });

      // If the deleted address was default, promote the newest remaining address to default
      if (existing.isDefault) {
        const newestRemaining = await tx.address.findFirst({
          where: { user_id: userId },
          orderBy: { createdAt: 'desc' },
        });

        if (newestRemaining) {
          await tx.address.update({
            where: { id: newestRemaining.id },
            data: { isDefault: true },
          });
        }
      }
    });

    return res.json({ success: true, message: 'Address deleted successfully' });
  } catch (error) {
    console.error('Delete address error:', error);
    return sendError(res, 500, ErrorCode.SERVER_ERROR, 'Failed to delete address');
  }
};

// PATCH /api/addresses/:id/default — Set address as primary default
export const setDefaultAddress = async (req: Request, res: Response) => {
  const userId = (req as any).user?.userId;
  const id = String(req.params.id);

  if (!userId) {
    return sendError(res, 401, ErrorCode.UNAUTHORIZED, 'Unauthorized');
  }

  try {
    const existing = await prisma.address.findFirst({
      where: { id, user_id: userId },
    });

    if (!existing) {
      return sendError(res, 404, ErrorCode.NOT_FOUND, 'Address not found');
    }

    const updatedAddress = await prisma.$transaction(async (tx) => {
      await tx.address.updateMany({
        where: { user_id: userId },
        data: { isDefault: false },
      });

      return tx.address.update({
        where: { id },
        data: { isDefault: true },
      });
    });

    return res.json({ success: true, data: updatedAddress });
  } catch (error) {
    console.error('Set default address error:', error);
    return sendError(res, 500, ErrorCode.SERVER_ERROR, 'Failed to set default address');
  }
};
