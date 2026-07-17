-- ============================================================
-- Migration: add_order_events_outbox_expiry_states
-- Handles:
--   1. OrderStatus enum: rename PAYMENT_FAILED→FAILED, add PROCESSING, RETURNED
--   2. TransactionStatus: add UNKNOWN value
--   3. IdempotencyStatus: add FAILED value
--   4. Orders table: add expiresAt column
--   5. IdempotencyRecord: add userId column
--   6. New tables: order_events, outbox_events
-- ============================================================

-- Step 1 & 2 & 3: Recreate OrderStatus WITHOUT PAYMENT_FAILED and with new values (PROCESSING, FAILED, RETURNED)
--         PostgreSQL cannot DROP a value from an enum directly, so we rename+recreate
ALTER TYPE "OrderStatus" RENAME TO "OrderStatus_old";

CREATE TYPE "OrderStatus" AS ENUM (
  'PENDING',
  'CONFIRMED',
  'PROCESSING',
  'SHIPPED',
  'DELIVERED',
  'CANCELLED',
  'FAILED',
  'RETURNED'
);

-- Update the orders table to use the new enum, migrating PAYMENT_FAILED to FAILED
ALTER TABLE orders
  ALTER COLUMN status DROP DEFAULT,
  ALTER COLUMN status TYPE "OrderStatus" USING (
    CASE WHEN status::text = 'PAYMENT_FAILED' THEN 'FAILED'::"OrderStatus"
         ELSE status::text::"OrderStatus"
    END
  ),
  ALTER COLUMN status SET DEFAULT 'PENDING';

DROP TYPE "OrderStatus_old";

-- Step 4: Add UNKNOWN to TransactionStatus enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'UNKNOWN' AND enumtypid = 'public."TransactionStatus"'::regtype) THEN
    ALTER TYPE "TransactionStatus" ADD VALUE 'UNKNOWN';
  END IF;
END $$;

-- Step 5: Add FAILED to IdempotencyStatus enum (if it exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'IdempotencyStatus') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'FAILED' AND enumtypid = 'public."IdempotencyStatus"'::regtype) THEN
      ALTER TYPE "IdempotencyStatus" ADD VALUE 'FAILED';
    END IF;
  END IF;
END $$;

-- Step 6: Add expiresAt to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS "expiresAt" TIMESTAMPTZ;

-- Step 7: Add userId to idempotency_records table (if it exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'idempotency_records') THEN
    EXECUTE 'ALTER TABLE idempotency_records ADD COLUMN IF NOT EXISTS "userId" INTEGER';
  END IF;
END $$;

-- Step 8: Create order_events table
CREATE TABLE IF NOT EXISTS order_events (
  id           TEXT         NOT NULL DEFAULT gen_random_uuid()::text,
  "orderId"    TEXT         NOT NULL,
  "fromStatus" "OrderStatus",
  "toStatus"   "OrderStatus" NOT NULL,
  reason       TEXT,
  actor        VARCHAR(100),
  "createdAt"  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT order_events_pkey PRIMARY KEY (id),
  CONSTRAINT order_events_orderId_fkey FOREIGN KEY ("orderId")
    REFERENCES orders(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS order_events_orderId_idx ON order_events ("orderId");

-- Step 9: Create outbox_events table
CREATE TABLE IF NOT EXISTS outbox_events (
  id            TEXT        NOT NULL DEFAULT gen_random_uuid()::text,
  "eventType"   VARCHAR(100) NOT NULL,
  "aggregateId" VARCHAR(100) NOT NULL,
  payload       JSONB       NOT NULL,
  published     BOOLEAN     NOT NULL DEFAULT FALSE,
  "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT outbox_events_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS outbox_events_published_createdAt_idx ON outbox_events (published, "createdAt");
