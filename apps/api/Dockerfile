# Multi-stage build for API service
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY apps/api/package*.json ./apps/api/
COPY packages/ ./packages/

# Install dependencies
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build the application
WORKDIR /app/apps/api
RUN npm run build

# Production image, copy all the files and run the app
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nodejs

# Copy package files and install production dependencies
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/apps/api/package*.json ./apps/api/
COPY --from=builder /app/packages/ ./packages/
RUN npm ci --only=production

# Copy built application
COPY --from=builder --chown=nodejs:nodejs /app/apps/api/dist ./dist

# Create uploads directory
RUN mkdir -p uploads && chown nodejs:nodejs uploads

USER nodejs

EXPOSE 3001

ENV PORT=3001

CMD ["node", "dist/apps/api/src/index.js"]