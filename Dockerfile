# ---- Builder Stage ----
FROM node:20-alpine AS builder

WORKDIR /app

# Install all dependencies (including devDependencies for tsx)
COPY package*.json ./
RUN npm ci

# Copy source code
COPY . .

# Generate Prisma client
RUN npx prisma generate

# ---- Production Stage ----
FROM node:20-alpine AS production

WORKDIR /app

# Install only production dependencies + tsx (needed to run .ts files)
COPY package*.json ./
RUN npm ci --omit=dev && npm install tsx

# Copy source and generated Prisma client from builder
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/generated ./generated
COPY . .

EXPOSE 5000

CMD ["npx", "tsx", "server.ts"]