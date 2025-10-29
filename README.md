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

This project uses a comprehensive environment variable strategy for managing configuration across development, staging, and production environments.

**Quick Start:**

```bash
# Option 1: Copy the base example
cp .env.example .env

# Option 2: Use the development-specific example (recommended)
cp .env.development.example .env

# Edit with your local values
vim .env
```

**📖 For detailed documentation, see [docs/ENVIRONMENT_VARIABLES.md](docs/ENVIRONMENT_VARIABLES.md)**

This comprehensive guide covers:

- Environment variable loading strategies (local, Docker, production)
- Backend (NestJS) and Frontend (Next.js) configuration
- Security best practices
- Cloud deployment strategies (AWS, Kubernetes, Vercel)
- Troubleshooting common issues

VS Code settings and recommended extensions are included under `.vscode/` to standardize local development.

## Database Migrations

When you modify the Prisma schema, generate a corresponding migration locally before pushing your changes:

```bash
pnpm exec prisma migrate dev --name <migration_name>
```

Commit the generated migration files alongside your schema updates. Continuous deployment applies pending migrations automatically on pushes to the `main` and `staging` branches using:

```bash
DATABASE_URL=${{ secrets.DATABASE_URL }} pnpm exec prisma migrate deploy
```

**📖 For comprehensive migration documentation, see [docs/PRISMA_MIGRATIONS.md](docs/PRISMA_MIGRATIONS.md)**

## Docker Compose Stack

A `docker-compose.yml` file is provided to boot the entire application stack (frontend, backend, PostgreSQL, and the nginx proxy) for local development.

1. Copy `.env.example` to `.env` and adjust the values as needed.
2. Start all services from the repository root:

   ```bash
   docker compose up -d
   ```

The stack exposes the following entry points:

| Service  | Description         | Host address                                      |
| -------- | ------------------- | ------------------------------------------------- |
| proxy    | nginx reverse proxy | http://localhost:8080                             |
| frontend | Next.js application | http://localhost:3000                             |
| backend  | NestJS API          | http://localhost:3001/api                         |
| db       | PostgreSQL database | postgresql://acme:acme123@localhost:5432/acme_dev |

Once the containers are healthy, run database migrations and seed the development data:

```bash
docker compose exec backend pnpm exec prisma migrate deploy
docker compose exec backend pnpm exec prisma db seed
```

Regenerate the Prisma client after schema updates with:

```bash
docker compose exec backend pnpm exec prisma generate
```

Shut everything down with:

```bash
docker compose down
```

## HTTPS / TLS Setup Guidance

The provided docker-compose stack is optimized for local development. For production deployment options—including examples of terminating HTTPS with nginx or Traefik and guidance on using Let's Encrypt—see [docs/HTTPS_GUIDANCE.md](docs/HTTPS_GUIDANCE.md).

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
