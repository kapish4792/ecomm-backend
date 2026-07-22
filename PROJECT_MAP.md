# E-Commerce Backend — Project Map

## Overview

**Brand:** ATELIER | **Stack:** Node.js + Express 5 + PostgreSQL + Prisma 7 + TypeScript (ESM)
**Entry:** `server.ts` | **Runtime:** `tsx` (no compile step)

---

## Directory Structure

```
ecom-backend/
├── server.ts                        # Express app bootstrap (routes, middleware, CORS, static)
├── package.json                     # ESM, scripts: dev (nodemon), start (tsx)
├── tsconfig.json                    # ES2022, bundler resolution, noEmit
├── Dockerfile                       # Multi-stage Alpine build
├── prisma/
│   ├── schema.prisma                # Canonical DB schema (12 models, 6 enums)
│   └── seed.ts                      # Seeds Role table (USER, ADMIN, SUPERADMIN)
├── config/
│   └── db.ts                        # pg Pool (raw SQL, used in auth + upload)
├── lib/
│   ├── prisma.ts                    # PrismaClient singleton (adapter-pg)
│   └── orderStateMachine.ts         # Order state machine: transitions + audit events
├── routes/                          # Route definitions + middleware composition
│   ├── auth.ts
│   ├── product.ts
│   ├── variant.ts
│   ├── attribute.ts
│   ├── category.ts
│   ├── order.ts
│   └── upload.ts
├── controllers/                     # Request handlers / business logic
│   ├── auth.controller.ts
│   ├── product.controller.ts
│   ├── variant.controller.ts
│   ├── attribute.controller.ts
│   ├── category.controller.ts
│   ├── order.controller.ts
│   └── upload.controller.ts
├── schemas/                         # Zod validation schemas (body, query, params)
│   ├── auth.schema.ts
│   ├── product.schema.ts
│   ├── variant.schema.ts
│   ├── attribute.schema.ts
│   ├── category.schema.ts
│   └── order.schema.ts
├── middleware/
│   ├── auth.ts                      # JWT protect + role-based authorize
│   ├── validate.ts                  # Generic Zod validation middleware
│   ├── rateLimiter.ts               # Order rate limiters (20/min, 5/min)
│   └── upload.ts                    # Multer config (disk, chunk support)
├── utils/
│   ├── auth.ts                      # Tokens, cookie opts, forgot-password limiter
│   ├── errors.ts                    # ErrorCode enum + sendError helper
│   ├── errorMessages.ts             # User-facing error strings
│   └── mailer.ts                    # Nodemailer + EJS template rendering
├── templates/
│   └── forgotPassword.ejs           # Password reset email template
├── uploads/                         # Uploaded media files
│   └── chunks/                      # Temp chunk storage
└── generated/prisma/                # Prisma client output (gitignored usually)
```

---

## Architecture: Controller-Route-Schema Layer

```
server.ts
  └── routes/*.ts        (HTTP methods, middleware stack, controller binding)
        └── controllers/*.ts   (req/res handling, business logic)
              ├── lib/prisma.ts           (Prisma ORM queries)
              ├── config/db.ts            (raw pg Pool queries)
              ├── schemas/*.schema.ts     (Zod input validation)
              └── utils/*.ts              (shared helpers)
```

- **Routes** wire HTTP verbs to controllers, applying middleware (auth, validate, rate-limit, upload).
- **Controllers** contain business logic, using Prisma (catalog/orders) or raw pg Pool (auth/uploads).
- **Schemas** are Zod objects parsed by `middleware/validate.ts`, splitting `body`, `query`, `params`.
- **Middleware** is composed per-route: `validate(schema)` → `protect` → `authorize('ADMIN')`.

---

## Database: Prisma Schema (12 Models)

### Auth & Users
| Model | Notes |
|---|---|
| `Role` | USER / ADMIN / SUPERADMIN |
| `users` | password (bcrypt), reset token/expiry, FK→roles |
| `refresh_tokens` | JWT refresh token store |

### Product Catalog (EAV Hybrid)
| Model | Notes |
|---|---|
| `Product` | name, slug, basePrice, images[], status (DRAFT/PUBLISHED/ARCHIVED), soft-delete |
| `Category` | name, slug, isActive (soft-delete) |
| `Attribute` | EAV attribute names (e.g. "Color") |
| `AttributeValue` | EAV values (e.g. "Red"), unique per attribute |
| `ProductVariant` | SKU, price, stock, FK→product |
| `VariantAttributeValue` | Junction: variant × attribute value |

### Orders & Payments
| Model | Notes |
|---|---|
| `Order` | totalAmount, shippingAddress (JSON), status, expiresAt (15 min) |
| `OrderItem` | variantId, quantity, priceAtPurchase (snapshot) |
| `OrderEvent` | Audit trail: fromStatus → toStatus, actor, reason |
| `Transaction` | Payment record: gateway, status, rawGatewayResponse |
| `OutboxEvent` | Async event queue (Saga persistence) |

### Media
| Model | Notes |
|---|---|
| `MediaFile` | Upload metadata (originalName, filename, mimeType, size) |

---

## API Endpoints

| Path | Auth | Notes |
|---|---|---|
| `POST /api/auth/register` | — | Register |
| `POST /api/auth/login` | — | Login |
| `POST /api/auth/refresh` | Cookie | Refresh access token |
| `POST /api/auth/change-password` | JWT | — |
| `POST /api/auth/forgot-password` | Rate-limited | Sends email |
| `POST /api/auth/reset-password` | Query token | — |
| `GET /api/auth/me` | JWT | Current user |
| `POST /api/auth/logout` | Cookie | — |
| `GET /api/products` | — | Published only |
| `GET /api/products/:id` | — | By ID or slug |
| `POST /api/products` | Admin | Create + variants |
| `PUT /api/products/:id` | Admin | — |
| `DELETE /api/products/:id` | Admin | Soft-delete |
| `GET /api/variants` | — | All variants |
| `GET /api/variants/:id` | — | By ID |
| `GET /api/products/:productId/variants` | — | Variants by product |
| `POST /api/products/:productId/variants` | Admin | Add variant |
| `PUT /api/variants/:id` | Admin | — |
| `DELETE /api/variants/:id` | Admin | — |
| `GET /api/attributes` | — | All attributes |
| `POST /api/attributes` | Admin | Create attribute |
| `GET /api/attributes/:id/values` | — | Values for attribute |
| `POST /api/attributes/:id/values` | Admin | Add value |
| `DELETE /api/attributes/:id` | Admin | — |
| `DELETE /api/attributes/values/:id` | Admin | — |
| `GET /api/categories` | — | Paginated |
| `GET /api/categories/:id` | — | Single |
| `POST /api/categories` | Admin | — |
| `PUT /api/categories/:id` | Admin | — |
| `DELETE /api/categories/:id` | Admin | Soft-delete |
| `GET /api/categories/:id/products` | — | Products in category |
| `POST /api/orders` | JWT + Rate (20/m) | Saga: stock deduct + outbox |
| `GET /api/orders` | JWT | User's orders, paginated |
| `GET /api/orders/:id` | JWT | Order detail |
| `PATCH /api/orders/:id/cancel` | JWT | — |
| `POST /api/orders/:id/retrypayment` | JWT + Rate (5/m) | — |
| `GET /api/orders/:id/events` | Admin | Audit log |
| `GET /api/upload` | — | List files |
| `GET /api/upload/search` | — | Search by name |
| `POST /api/upload` | Admin | Single or chunked |
| `GET /api/upload/:id` | — | Redirect to file URL |
| `DELETE /api/upload/:id` | Admin | — |

---

## Key Patterns

- **Dual DB access:** Prisma for catalog/orders; raw `pg.Pool` for auth + uploads (camelCase columns)
- **EAV catalog:** Variants are attribute-value combinations; attribute upsert on variant creation
- **Order Saga:** Stock deducted + order created + outbox event inserted in one Prisma transaction; payment is mock (80% success)
- **State machine:** `lib/orderStateMachine.ts` — explicit allowed transitions, terminal states, auto-audit via OrderEvent
- **Error handling:** All errors through `sendError(res, code, message)` with `ErrorCode` enum
- **Auth:** JWT access (15m) + refresh (1d, httpOnly cookie) + bcrypt + role guard
- **Rate limiting:** express-rate-limit keyed by user ID for orders + forgot-password
- **Chunked uploads:** Headers `x-upload-id`, `x-chunk-index`, `x-total-chunks`; assembled from `uploads/chunks/`
