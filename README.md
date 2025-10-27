# Turborepo Monorepo Scaffold

This repository is a starter Turborepo workspace managed with pnpm. It provides shared tooling for linting, formatting, type checking, and commit hygiene across multiple applications and packages.

## What's Included

- **Turborepo** pipeline orchestration
- **pnpm** workspaces (`apps/*`, `packages/*`)
- **TypeScript** project references with shared base config (`@acme/tsconfig`)
- **ESLint** shared configuration (`@acme/eslint-config`)
- **Prettier** formatting with VS Code integration
- **Husky** + **lint-staged** pre-commit hooks
- **Commitlint** & **Commitizen** for Conventional Commits
- Example `web` app: Next.js 14 + Tailwind CSS with multilingual (Arabic/French) & RTL-ready scaffolding
- Shared `utils` package using the common tooling

## Getting Started

1. Install dependencies:
   ```bash
   pnpm install
   ```
2. Initialize Husky hooks (automatically runs via `pnpm install` through the `prepare` script). If needed, run:
   ```bash
   pnpm prepare
   ```
3. Run tasks with Turborepo:
   ```bash
   pnpm dev     # Start all dev tasks in parallel
   pnpm build   # Build all apps and packages
   pnpm lint    # Lint all workspaces
   pnpm typecheck
   pnpm clean
   ```

### Conventional Commits

Use the interactive helper for Conventional Commits:

```bash
pnpm commit
```

Commit messages are also validated automatically via Husky and Commitlint.

## Workspace Structure

```
apps/
  web/            # Next.js 14 frontend with Tailwind, next-intl and RTL support
packages/
  eslint-config/  # Shared ESLint configuration
  tsconfig/       # Shared TypeScript configuration
  utils/          # Example shared package
```

## Environment Management

Copy `.env.example` to `.env` (or create per-app `.env` files) and adjust values for your environment. VS Code settings and recommended extensions are included under `.vscode/` to standardize local development.

## Database & Prisma

A PostgreSQL stack is provided via Docker Compose for both development and test environments. From the repository root, run:

```bash
docker compose up -d postgres postgres-test
```

Once the containers are healthy, apply the baseline schema and seed localized sample data:

```bash
pnpm --filter api prisma:migrate
pnpm --filter api prisma:seed
```

Regenerate the Prisma client after schema changes with:

```bash
pnpm --filter api prisma:generate
```

## AWS S3 File Storage

The application uses AWS S3 for document storage. Configure the following environment variables in your `.env` file or through your hosting platform's environment variables:

```bash
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key-id
AWS_SECRET_ACCESS_KEY=your-secret-access-key
AWS_S3_BUCKET_NAME=your-bucket-name
S3_PRESIGNED_URL_EXPIRATION=3600
```

### Optional Configuration

For S3-compatible services (e.g., MinIO, DigitalOcean Spaces):

```bash
AWS_S3_ENDPOINT=https://your-custom-endpoint.com
AWS_S3_FORCE_PATH_STYLE=true
```

### Local Development

For local development, you can use MinIO as an S3-compatible storage service:

1. Start MinIO via Docker:

   ```bash
   docker run -p 9000:9000 -p 9001:9001 \
     -e MINIO_ROOT_USER=minioadmin \
     -e MINIO_ROOT_PASSWORD=minioadmin \
     minio/minio server /data --console-address ":9001"
   ```

2. Configure your `.env`:

   ```bash
   AWS_REGION=us-east-1
   AWS_ACCESS_KEY_ID=minioadmin
   AWS_SECRET_ACCESS_KEY=minioadmin
   AWS_S3_BUCKET_NAME=uploads
   AWS_S3_ENDPOINT=http://localhost:9000
   AWS_S3_FORCE_PATH_STYLE=true
   ```

3. Create the bucket via MinIO Console at http://localhost:9001
