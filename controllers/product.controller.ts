import type { Request, Response } from 'express';
import prisma from '../lib/prisma.ts';
import { sendError, ErrorCode } from '../utils/errors.ts';
import { ErrorMessage } from '../utils/errorMessages.ts';

export const createProduct = async (req: Request, res: Response) => {
    try {
        const { name, price, category, description, imageUrl, images, attributes, globalAttributes, variants } = req.body;

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

        // Collect all unique global/product attributes
        const allProductAttributes: { key: string; value: string }[] = [];
        const seenAttributes = new Set<string>();

        const addUniqueAttribute = (key: string, value: string) => {
            const trimmedKey = key.trim();
            const trimmedValue = value.trim();
            const identifier = `${trimmedKey.toLowerCase()}:${trimmedValue.toLowerCase()}`;
            if (!seenAttributes.has(identifier)) {
                seenAttributes.add(identifier);
                allProductAttributes.push({ key: trimmedKey, value: trimmedValue });
            }
        };

        // Add initial attributes (from either globalAttributes or attributes field)
        const initialAttributes = globalAttributes || attributes || [];
        for (const attr of initialAttributes) {
            if (attr && attr.key && attr.value) {
                addUniqueAttribute(attr.key, attr.value);
            }
        }

        // Parse and format variants
        const formattedVariants = (variants || []).map((v: any) => {
            let size = v.size || null;
            let color = v.color || null;
            const variantAttributes: { key: string; value: string }[] = [];

            if (Array.isArray(v.attributes)) {
                for (const attr of v.attributes) {
                    if (attr && attr.key && attr.value) {
                        const lowerKey = attr.key.toLowerCase();
                        if (lowerKey === 'size') {
                            size = attr.value;
                        } else if (lowerKey === 'color') {
                            color = attr.value;
                        }
                        // Also add all variant attributes to the product attribute list
                        addUniqueAttribute(attr.key, attr.value);
                        variantAttributes.push({ key: attr.key.trim(), value: attr.value.trim() });
                    }
                }
            } else {
                // If they passed direct size/color without an attributes array, mock the attributes array for consistency
                if (v.size) {
                    addUniqueAttribute('Size', String(v.size));
                    variantAttributes.push({ key: 'Size', value: String(v.size).trim() });
                }
                if (v.color) {
                    addUniqueAttribute('Color', String(v.color));
                    variantAttributes.push({ key: 'Color', value: String(v.color).trim() });
                }
            }

            return {
                sku: v.sku,
                stock: v.stock !== undefined ? Number(v.stock) : 0,
                size: size ? String(size) : null,
                color: color ? String(color) : null,
                attributes: variantAttributes
            };
        });

        const product = await prisma.product.create({
            data: {
                name,
                slug,
                price,
                category,
                description,
                imageUrl: imageUrl || '',
                images: images || [],
                attributes: {
                    connectOrCreate: allProductAttributes.map((a) => ({
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
                    create: formattedVariants.map((v: any) => ({
                        sku: v.sku,
                        stock: v.stock,
                        size: v.size,
                        color: v.color,
                        attributes: {
                            connect: v.attributes.map((a: any) => ({
                                key_value: {
                                    key: a.key,
                                    value: a.value
                                }
                            }))
                        }
                    }))
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