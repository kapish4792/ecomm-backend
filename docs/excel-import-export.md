# Excel Product Import/Export — Plan

## Goal
Add Excel (.xlsx) based bulk import, export, and template download for products (including their variants and EAV attributes), exposed to admin users.

## Dependency
- Add `exceljs` (read + write `.xlsx`, streaming export support).

## New files
| File | Purpose |
| --- | --- |
| `middleware/excelUpload.ts` | Multer instance accepting only `.xlsx`. Existing `middleware/upload.ts` fileFilter blocks xlsx, so a separate multer config is required. |
| `lib/productExcel.ts` | Excel column definitions, row ↔ object mappers, workbook writer (export/template) and parser (import). |
| `controllers/productImport.controller.ts` | Handlers for `exportProducts`, `downloadTemplate`, `importProducts`. |
| `schemas/productImport.schema.ts` | Zod schemas for query params / import metadata. |
| `routes/productImport.ts` | Route wiring. Registered in `server.ts`. |

## Endpoints
All routes use `protect` + `authorize(['ADMIN', 'SUPERADMIN'])`.

### 1. `GET /api/products/export`
- Streams an `.xlsx` workbook as an attachment (`Content-Disposition: attachment; filename=products-<timestamp>.xlsx`).
- One row per **variant**, with product-level columns repeated:
  - Product: `name`, `slug`, `basePrice`, `category`, `description`, `status`, `imageUrl`, `images` (comma-separated)
  - Variant: `sku`, `variantPrice`, `stock`, `variantImages` (comma-separated), `attributes` (e.g. `Color:Red;Size:M`)
- Reuses the `productInclude` shape from `controllers/product.controller.ts:30` to fetch products + variants + attributes.
- Excludes soft-deleted products (`isDeleted: false`).

### 2. `GET /api/products/import/template`
- Returns a blank `.xlsx` with the same headers as export plus one example row and a header-comment describing each column.

### 3. `POST /api/products/import`
- Body: `multipart/form-data`, field `file`, `.xlsx` only, max ~5MB.
- Parse workbook with exceljs, validate each row with Zod (reusing messages from `utils/errorMessages.ts`).
- Import strategy (one Prisma `$transaction`):
  - **Product upsert** — match by `slug`; update existing or create new (slug conflict-safe suffix logic reused from create flow).
  - **Variant upsert** — match by `sku`; create new or update existing.
  - **Categories** — auto-create from category slug when missing.
  - **Attributes** — reuse `resolveAttributeValueIds()` from `controllers/product.controller.ts:9`.
- Response report: `{ success: true, data: { totalRows, created, updated, errors: [{ row, field, message }] } }`.
  - Rows with validation errors are skipped and reported; valid rows still commit.

## Error shape
All failures follow `{ success: false, error: { code, message, details? } }` via `sendError()` from `utils/errors.ts`.

## Verification
- Run `npx tsc --noEmit` after implementation.
- Manual smoke test via Postman for all three endpoints.
