import type { Request, Response } from 'express';
import prisma from '../lib/prisma.ts';
import { sendError, ErrorCode } from '../utils/errors.ts';
import { ErrorMessage } from '../utils/errorMessages.ts';

export const createProduct = async (req: Request, res: Response) => {
    try {
        const { name, price, category, description, imageUrl, images, attributes, variants } = req.body;

        const baseSlug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'product';

        // Find existing slugs starting with this base slug
        const existingProducts = await prisma.product.findMany({
            where: {
                slug: {
                    startsWith: baseSlug
                }
            },
            select: {
                slug: true
            }
        });

        let slug = baseSlug;
        if (existingProducts.length > 0) {
            const existingSlugs = existingProducts.map(p => p.slug);
            if (existingSlugs.includes(baseSlug)) {
                let count = 1;
                while (existingSlugs.includes(`${baseSlug}-${count}`)) {
                    count++;
                }
                slug = `${baseSlug}-${count}`;
            }
        }

        const product = await prisma.product.create({
            data: {
                name,
                slug,
                price,
                category,
                description,
                imageUrl,
                images,
                attributes: {
                    connectOrCreate: (attributes || []).map((a: { key: string; value: string }) => ({
                        where: {
                            key_value: {
                                key: a.key,
                                value: a.value
                            }
                        },
                        create: {
                            key: a.key,
                            value: a.value
                        }
                    }))
                },
                variants: {
                    create: variants // Adds sizes/stock simultaneously
                }
            },
            include: { variants: true, attributes: true }
        });
        return res.status(201).json({ success: true, data: product });
    } catch (error: any) {
        console.error("Create product error:", error);
        if (error?.code === 'P2002') {
            return sendError(res, 400, ErrorCode.CONFLICT, ErrorMessage.PRODUCT_ALREADY_EXISTS, {
                target: error.meta?.target || ['slug']
            });
        }
        return sendError(res, 500, ErrorCode.SERVER_ERROR, ErrorMessage.CREATE_PRODUCT_FAILED);
    }
};

export const getProducts = async (req: Request, res: Response) => {
    try {
        const products = await prisma.product.findMany({
            where: { isDeleted: false },
            include: { variants: true, attributes: true }
        });
        return res.json({ success: true, data: products });
    } catch (error) {
        console.error("Get products error:", error);
        return sendError(res, 500, ErrorCode.SERVER_ERROR, ErrorMessage.FETCH_PRODUCTS_FAILED);
    }
};

export const getProductById = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        const product = await prisma.product.findUnique({
            where: { id: String(id) },
            include: { variants: true, attributes: true }
        });
        if (!product || product.isDeleted) {
            return sendError(res, 404, ErrorCode.NOT_FOUND, ErrorMessage.PRODUCT_NOT_FOUND);
        }
        return res.json({ success: true, data: product });
    } catch (error) {
        console.error("Get product by id error:", error);
        return sendError(res, 500, ErrorCode.SERVER_ERROR, ErrorMessage.FETCH_PRODUCTS_FAILED);
    }
};

export const updateProduct = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        const product = await prisma.product.findUnique({
            where: { id: String(id) }
        });
        if (!product || product.isDeleted) {
            return sendError(res, 404, ErrorCode.NOT_FOUND, ErrorMessage.PRODUCT_NOT_FOUND);
        }

        const { attributes, variants, ...updateData } = req.body;

        const updatedProduct = await prisma.product.update({
            where: { id: String(id) },
            data: updateData,
            include: { variants: true, attributes: true }
        });
        return res.json({ success: true, data: updatedProduct });
    } catch (error: any) {
        console.error("Update product error:", error);
        if (error?.code === 'P2002') {
            return sendError(res, 400, ErrorCode.CONFLICT, ErrorMessage.PRODUCT_ALREADY_EXISTS, {
                target: error.meta?.target || ['slug']
            });
        }
        return sendError(res, 500, ErrorCode.SERVER_ERROR, ErrorMessage.UPDATE_PRODUCT_FAILED);
    }
};

export const deleteProduct = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        const product = await prisma.product.findUnique({
            where: { id: String(id) }
        });
        if (!product || product.isDeleted) {
            return sendError(res, 404, ErrorCode.NOT_FOUND, ErrorMessage.PRODUCT_NOT_FOUND);
        }

        await prisma.product.update({
            where: { id: String(id) },
            data: { isDeleted: true }
        });
        return res.status(200).json({ success: true, message: ErrorMessage.PRODUCT_DELETED });
    } catch (error) {
        console.error("Delete product error:", error);
        return sendError(res, 500, ErrorCode.SERVER_ERROR, ErrorMessage.DELETE_PRODUCT_FAILED);
    }
};