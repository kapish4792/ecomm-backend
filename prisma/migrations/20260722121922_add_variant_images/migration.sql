-- AlterTable
ALTER TABLE "attribute_values" ALTER COLUMN "id" SET DEFAULT concat('val_', floor(random() * 90000 + 10000)::text);

-- AlterTable
ALTER TABLE "attributes" ALTER COLUMN "id" SET DEFAULT concat('attr_', floor(random() * 90000 + 10000)::text);

-- AlterTable
ALTER TABLE "product_variants" ADD COLUMN     "images" TEXT[] DEFAULT ARRAY[]::TEXT[],
ALTER COLUMN "id" SET DEFAULT concat('var_', floor(random() * 90000 + 10000)::text);
