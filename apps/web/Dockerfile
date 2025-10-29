# ========================================
# Stage 1: Dependencies & Build
# ========================================
FROM node:20-alpine AS builder

# Install system dependencies for compatibility
RUN apk add --no-cache libc6-compat

# Enable pnpm via Corepack (built into Node.js 20)
RUN corepack enable && corepack prepare pnpm@8.15.4 --activate

# Disable Next.js telemetry during build
ENV NEXT_TELEMETRY_DISABLED=1

# Set working directory to the monorepo root
WORKDIR /app

# Copy monorepo configuration files for dependency resolution
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./

# Copy package.json files for all workspace packages
COPY apps/web/package.json ./apps/web/package.json
COPY apps/api/package.json ./apps/api/package.json
COPY packages/eslint-config/package.json ./packages/eslint-config/package.json
COPY packages/shared-dto/package.json ./packages/shared-dto/package.json
COPY packages/tsconfig/package.json ./packages/tsconfig/package.json
COPY packages/utils/package.json ./packages/utils/package.json

# Install all dependencies using frozen lockfile for reproducible builds
# --frozen-lockfile ensures the lockfile is not modified during installation
RUN pnpm install --frozen-lockfile

# Copy the full source code for building
COPY apps/web ./apps/web
COPY packages ./packages

# Build the Next.js application
# This generates optimized production assets in the .next directory
WORKDIR /app/apps/web
RUN pnpm run build

# Return to the workspace root and prune development dependencies to reduce the final image size
WORKDIR /app
RUN pnpm prune --prod

# ========================================
# Stage 2: Production Runtime
# ========================================
FROM node:20-alpine AS runner

# Install system dependencies and enable pnpm
RUN apk add --no-cache libc6-compat \
    && corepack enable \
    && corepack prepare pnpm@8.15.4 --activate

# Set production environment variables
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000

WORKDIR /app

# Create a non-root user for running the application (security best practice)
# Running as non-root minimizes potential security risks
RUN addgroup -S -g 1001 nodejs && \
    adduser -S -u 1001 -G nodejs nextjs

# Copy package.json for dependency information
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/package.json ./

# Copy Next.js configuration files required at runtime
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/next.config.mjs ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/next-intl.config.ts ./

# Copy public folder containing static assets
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/public ./public

# Copy the Next.js build output (.next directory contains the compiled app)
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next ./.next

# Copy node_modules from the builder stage
# For pnpm monorepos, we need the root node_modules which contains all dependencies
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules

# Switch to non-root user before starting the application
USER nextjs

# Expose port 3000 for the Next.js application
EXPOSE 3000

# Start the Next.js production server
CMD ["pnpm", "start"]
