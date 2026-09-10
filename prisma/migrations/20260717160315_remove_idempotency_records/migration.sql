/*
  Warnings:

  - You are about to drop the column `idempotencyKey` on the `orders` table. All the data in the column will be lost.
  - You are about to drop the `idempotency_records` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "order_events" DROP CONSTRAINT "order_events_orderid_fkey";

-- DropIndex
DROP INDEX "order_events_orderid_idx";

-- DropIndex
DROP INDEX "orders_idempotencyKey_key";

-- AlterTable
ALTER TABLE "order_events" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "orders" DROP COLUMN "idempotencyKey",
ALTER COLUMN "expiresAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "outbox_events" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3);

-- DropTable
DROP TABLE "idempotency_records";

-- DropEnum
DROP TYPE "IdempotencyStatus";

-- AddForeignKey
ALTER TABLE "order_events" ADD CONSTRAINT "order_events_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "outbox_events_published_createdat_idx" RENAME TO "outbox_events_published_createdAt_idx";
