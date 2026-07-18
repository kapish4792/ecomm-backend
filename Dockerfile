# ---- Builder Stage ----
FROM node:24-alpine AS builder

WORKDIR /app

# Install all dependencies (including devDependencies for prisma CLI)
COPY package*.json ./
RUN npm ci

# Copy source and prisma schema
COPY . .

# Generate Prisma client into ./generated/prisma (as per schema output config)
RUN npx prisma generate

# ---- Production Stage ----
FROM node:24-alpine AS production

WORKDIR /app

# Install production dependencies + tsx (needed to run .ts files)
COPY package*.json ./
RUN npm ci --omit=dev && npm install tsx prisma

# Copy generated Prisma client from builder (output = "../generated/prisma")
COPY --from=builder /app/generated ./generated

# Copy application source
COPY . .

EXPOSE 5000

CMD ["sh", "-c", "npx prisma migrate deploy && npx tsx prisma/seed.ts && npx tsx server.ts"]