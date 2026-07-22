/*
  Warnings:

  - You are about to drop the `Attribute` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Product` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ProductVariant` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `_AttributeToProduct` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `_AttributeToProductVariant` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "ProductStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- DropForeignKey
ALTER TABLE "ProductVariant" DROP CONSTRAINT "ProductVariant_productId_fkey";

-- DropForeignKey
ALTER TABLE "_AttributeToProduct" DROP CONSTRAINT "_AttributeToProduct_A_fkey";

-- DropForeignKey
ALTER TABLE "_AttributeToProduct" DROP CONSTRAINT "_AttributeToProduct_B_fkey";

-- DropForeignKey
ALTER TABLE "_AttributeToProductVariant" DROP CONSTRAINT "_AttributeToProductVariant_A_fkey";

-- DropForeignKey
ALTER TABLE "_AttributeToProductVariant" DROP CONSTRAINT "_AttributeToProductVariant_B_fkey";

-- DropForeignKey
ALTER TABLE "order_items" DROP CONSTRAINT "order_items_productVariantId_fkey";

-- DropTable
DROP TABLE "Attribute";

-- DropTable
DROP TABLE "Product";

-- DropTable
DROP TABLE "ProductVariant";

-- DropTable
DROP TABLE "_AttributeToProduct";

-- DropTable
DROP TABLE "_AttributeToProductVariant";

-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "basePrice" DECIMAL(12,2) NOT NULL,
    "category" TEXT NOT NULL,
    "displayCategory" TEXT,
    "imageUrl" TEXT NOT NULL DEFAULT '',
    "images" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "description" TEXT NOT NULL,
    "status" "ProductStatus" NOT NULL DEFAULT 'DRAFT',
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "slug" VARCHAR(120) NOT NULL,
    "description" TEXT,
    "imageUrl" VARCHAR(500),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attributes" (
    "id" TEXT NOT NULL DEFAULT concat('attr_', floor(random() * 90000 + 10000)::text),
    "name" VARCHAR(50) NOT NULL,

    CONSTRAINT "attributes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attribute_values" (
    "id" TEXT NOT NULL DEFAULT concat('val_', floor(random() * 90000 + 10000)::text),
    "attributeId" TEXT NOT NULL,
    "value" VARCHAR(100) NOT NULL,

    CONSTRAINT "attribute_values_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_variants" (
    "id" TEXT NOT NULL DEFAULT concat('var_', floor(random() * 90000 + 10000)::text),
    "productId" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "price" DECIMAL(12,2) NOT NULL,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_variants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "variant_attribute_values" (
    "variantId" TEXT NOT NULL,
    "attributeValueId" TEXT NOT NULL,

    CONSTRAINT "variant_attribute_values_pkey" PRIMARY KEY ("variantId","attributeValueId")
);

-- CreateTable
CREATE TABLE "_CategoryToProduct" (
    "A" INTEGER NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_CategoryToProduct_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "products_slug_key" ON "products"("slug");

-- CreateIndex
CREATE INDEX "products_category_idx" ON "products"("category");

-- CreateIndex
CREATE INDEX "products_status_idx" ON "products"("status");

-- CreateIndex
CREATE UNIQUE INDEX "categories_name_key" ON "categories"("name");

-- CreateIndex
CREATE UNIQUE INDEX "categories_slug_key" ON "categories"("slug");

-- CreateIndex
CREATE INDEX "categories_slug_idx" ON "categories"("slug");

-- CreateIndex
CREATE INDEX "categories_isActive_idx" ON "categories"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "attributes_name_key" ON "attributes"("name");

-- CreateIndex
CREATE UNIQUE INDEX "attribute_values_attributeId_value_key" ON "attribute_values"("attributeId", "value");

-- CreateIndex
CREATE UNIQUE INDEX "product_variants_sku_key" ON "product_variants"("sku");

-- CreateIndex
CREATE INDEX "_CategoryToProduct_B_index" ON "_CategoryToProduct"("B");

-- AddForeignKey
ALTER TABLE "attribute_values" ADD CONSTRAINT "attribute_values_attributeId_fkey" FOREIGN KEY ("attributeId") REFERENCES "attributes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "variant_attribute_values" ADD CONSTRAINT "variant_attribute_values_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "product_variants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "variant_attribute_values" ADD CONSTRAINT "variant_attribute_values_attributeValueId_fkey" FOREIGN KEY ("attributeValueId") REFERENCES "attribute_values"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_productVariantId_fkey" FOREIGN KEY ("productVariantId") REFERENCES "product_variants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CategoryToProduct" ADD CONSTRAINT "_CategoryToProduct_A_fkey" FOREIGN KEY ("A") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CategoryToProduct" ADD CONSTRAINT "_CategoryToProduct_B_fkey" FOREIGN KEY ("B") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
