-- ============================================================
-- STEP 1: Add new enum values (must be committed before use)
-- ============================================================

-- Add PROCESSING to OrderStatus (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'PROCESSING'
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'OrderStatus')
  ) THEN
    ALTER TYPE "OrderStatus" ADD VALUE 'PROCESSING';
  END IF;
END $$;

-- Add RETURNED to OrderStatus (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'RETURNED'
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'OrderStatus')
  ) THEN
    ALTER TYPE "OrderStatus" ADD VALUE 'RETURNED';
  END IF;
END $$;

-- Add FAILED to OrderStatus (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'FAILED'
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'OrderStatus')
  ) THEN
    ALTER TYPE "OrderStatus" ADD VALUE 'FAILED';
  END IF;
END $$;

-- Add UNKNOWN to TransactionStatus (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'UNKNOWN'
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'TransactionStatus')
  ) THEN
    ALTER TYPE "TransactionStatus" ADD VALUE 'UNKNOWN';
  END IF;
END $$;

-- Add FAILED to IdempotencyStatus (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'FAILED'
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'IdempotencyStatus')
  ) THEN
    ALTER TYPE "IdempotencyStatus" ADD VALUE 'FAILED';
  END IF;
END $$;
