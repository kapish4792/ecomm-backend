-- CreateTable
CREATE TABLE "_AttributeToProductVariant" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_AttributeToProductVariant_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_AttributeToProductVariant_B_index" ON "_AttributeToProductVariant"("B");

-- AddForeignKey
ALTER TABLE "_AttributeToProductVariant" ADD CONSTRAINT "_AttributeToProductVariant_A_fkey" FOREIGN KEY ("A") REFERENCES "Attribute"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AttributeToProductVariant" ADD CONSTRAINT "_AttributeToProductVariant_B_fkey" FOREIGN KEY ("B") REFERENCES "ProductVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
