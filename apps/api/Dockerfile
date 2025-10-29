# ==============================================================================
# Stage 1: Builder
# ==============================================================================
# Build the application and its dependencies
FROM node:20-alpine AS builder

# Install necessary system dependencies for building native modules
RUN apk add --no-cache libc6-compat python3 make g++ openssl

# Enable pnpm
RUN corepack enable && corepack prepare pnpm@8.15.4 --activate

# Set working directory
WORKDIR /app

# Copy workspace configuration files
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./

# Copy package.json files for all workspaces to leverage Docker layer caching
COPY apps/api/package.json ./apps/api/
COPY packages/shared-dto/package.json ./packages/shared-dto/
COPY packages/tsconfig/package.json ./packages/tsconfig/
COPY packages/eslint-config/package.json ./packages/eslint-config/

# Install all dependencies (including dev dependencies needed for building)
RUN pnpm install --frozen-lockfile

# Copy the entire monorepo source code
COPY . .

# Build the shared-dto package first (dependency of API)
WORKDIR /app/packages/shared-dto
RUN pnpm run build

# Generate Prisma Client
WORKDIR /app/apps/api
RUN pnpm exec prisma generate

# Build the API application
RUN pnpm run build

# Prune development dependencies to keep only production packages at runtime
WORKDIR /app
RUN pnpm prune --prod

# ==============================================================================
# Stage 2: Production
# ==============================================================================
# Create a minimal production image with only runtime dependencies
FROM node:20-alpine AS production

# Install necessary runtime dependencies
RUN apk add --no-cache dumb-init openssl

# Create a non-root user for running the application
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001 -G nodejs

# Set working directory
WORKDIR /app

# Set environment variables for production runtime
ENV NODE_ENV=production

# Copy workspace configuration files
COPY --chown=nestjs:nodejs pnpm-workspace.yaml package.json pnpm-lock.yaml ./

# Copy package.json files 
COPY --chown=nestjs:nodejs apps/api/package.json ./apps/api/
COPY --chown=nestjs:nodejs packages/shared-dto/package.json ./packages/shared-dto/

# Copy production node_modules from builder (already pruned)
COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/apps/api/node_modules ./apps/api/node_modules

# Copy shared-dto workspace (with built artifacts) from builder
COPY --from=builder --chown=nestjs:nodejs /app/packages/shared-dto ./packages/shared-dto

# Copy built API application from builder
COPY --from=builder --chown=nestjs:nodejs /app/apps/api/dist ./apps/api/dist

# Copy Prisma schema and migrations for runtime (needed for Prisma Client)
COPY --from=builder --chown=nestjs:nodejs /app/apps/api/prisma ./apps/api/prisma

# Set the working directory to the API app
WORKDIR /app/apps/api

# Switch to non-root user
USER nestjs

# Expose the application port (default NestJS port)
EXPOSE 3000

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "dist/main.js"]
