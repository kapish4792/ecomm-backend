-- ============================================================
-- STEP 2: Data migration + schema changes
-- (Runs after step1 is committed so new enum values are usable)
-- ============================================================

-- 2a. Migrate PAYMENT_FAILED rows → FAILED (new enum value is now committed)
UPDATE orders
SET status = 'FAILED'::"OrderStatus"
WHERE status = 'PAYMENT_FAILED'::"OrderStatus";

-- 2b. Recreate OrderStatus WITHOUT PAYMENT_FAILED
--     PostgreSQL cannot DROP a value from an enum; must rename + recreate.

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

-- Update the orders table to use the new enum type
ALTER TABLE orders
  ALTER COLUMN status DROP DEFAULT,
  ALTER COLUMN status TYPE "OrderStatus" USING status::text::"OrderStatus",
  ALTER COLUMN status SET DEFAULT 'PENDING';

DROP TYPE "OrderStatus_old";

-- 2c. Add expiresAt to orders (PENDING auto-expiry: 15 minutes)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS "expiresAt" TIMESTAMPTZ;

-- 2d. Add userId to idempotency_records
ALTER TABLE idempotency_records ADD COLUMN IF NOT EXISTS "userId" INTEGER;

-- 2e. Create order_events table (audit trail for all state transitions)
CREATE TABLE IF NOT EXISTS order_events (
  id            TEXT          NOT NULL DEFAULT gen_random_uuid()::text,
  "orderId"     TEXT          NOT NULL,
  "fromStatus"  "OrderStatus",
  "toStatus"    "OrderStatus" NOT NULL,
  reason        TEXT,
  actor         VARCHAR(100),
  "createdAt"   TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  CONSTRAINT order_events_pkey PRIMARY KEY (id),
  CONSTRAINT order_events_orderId_fkey
    FOREIGN KEY ("orderId") REFERENCES orders(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS order_events_orderId_idx ON order_events ("orderId");
CREATE INDEX IF NOT EXISTS order_events_createdAt_idx ON order_events ("createdAt");

-- 2f. Create outbox_events table (Saga / async event publishing)
CREATE TABLE IF NOT EXISTS outbox_events (
  id            TEXT          NOT NULL DEFAULT gen_random_uuid()::text,
  "eventType"   VARCHAR(100)  NOT NULL,
  "aggregateId" VARCHAR(100)  NOT NULL,
  payload       JSONB         NOT NULL,
  published     BOOLEAN       NOT NULL DEFAULT FALSE,
  "createdAt"   TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  CONSTRAINT outbox_events_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS outbox_events_published_idx
  ON outbox_events (published, "createdAt");
