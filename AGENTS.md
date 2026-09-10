# Ecom Backend — Agent Guide

## Quick start
```bash
npm run dev        # nodemon server.ts (port from .env, default 8080)
npx tsc --noEmit   # typecheck only (noEmit: true, tsx runs .ts directly)
```

## Architecture
- **Entry**: `server.ts` — Express 5 app, mounts routes at `/api/*`
- **Layer pattern**: `routes/` → middleware (auth, validate, rate-limit) → `controllers/` → Prisma / raw pg
- **Dual DB access**: catalog/orders use Prisma ORM; auth + uploads use raw `pg.Pool` (camelCase column names)
- **Validation**: Zod schemas in `schemas/`, parsed by `middleware/validate.ts`. Each schema has `body`, `query`, `params` keys. Validated values **replace** `req.body/query/params`.
- **Auth middleware stack order**: `protect` → `authorize(['ADMIN', ...])` → `validate(Schema)` → controller
- **Error shape**: `{ success: false, error: { code, message, details? } }` via `sendError()` from `utils/errors.ts`

## Prisma
- Schema: `prisma/schema.prisma`, client output: `generated/prisma/`
- Config: `prisma.config.ts` (detected by Prisma CLI)
- **Always run `npx prisma generate` after schema changes** — the generated client is checked in
- Migrations: `npx prisma migrate dev --name <name>`
- Seed: `npx tsx prisma/seed.ts` (seeds Role table)

## Database models (12 total)
- **EAV catalog**: `Attribute` → `AttributeValue` ← `VariantAttributeValue` → `ProductVariant` → `Product`
- **Product**: has `imageUrl` (string) + `images` (string[]) + `categories` (M:N via implicit `_CategoryToProduct`)
- **Variant**: has `images` (string[]), custom ID pattern `var_XXXXX`
- **Attribute/Value**: custom ID pattern `attr_XXXXX` / `val_XXXXX`
- **Categories**: soft-delete via `isActive` boolean (default filter to `isActive: true` in list queries)
- **Orders**: state machine in `lib/orderStateMachine.ts`; status transitions validated via `transitionOrder()` within a Prisma transaction. Terminal states: CANCELLED, FAILED, RETURNED.
- **Order flow**: Saga pattern — stock deducted + order created + `OutboxEvent` inserted in one transaction

## Key conventions
- **ESM**: `"type": "module"` in package.json — imports require `.ts` extensions
- **No build step**: `tsx` runs TypeScript directly at runtime (Dockerfile uses `npx tsx server.ts`)
- **Controllers** destructure `req.body` after `validate()` has already parsed/transformed it
- **Categories list** defaults to `isActive: true` — pass `?isActive=false` to show disabled
- **No tests** — no test framework set up

## Deployment
- GitHub Actions (`master` push) → SSH deploy to Hostinger VPS → `docker compose up -d --build`
- Dockerfile: multi-stage Alpine, `prisma migrate deploy` + seed on container start
- Port exposed: 5000 (container), mapped via docker compose
