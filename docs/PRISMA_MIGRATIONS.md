# Prisma Migrations Guide

This document explains how to create, manage, and deploy database migrations using Prisma in this monorepo project.

## Overview

This project uses Prisma as the ORM and migration tool. The Prisma schema is located at `apps/api/prisma/schema.prisma`. Migrations are automatically applied to production and staging databases via GitHub Actions when code is pushed to the `main` or `staging` branches.

## Creating New Migrations

### 1. Modify the Prisma Schema

Edit the schema file at `apps/api/prisma/schema.prisma` to make your desired changes:

```prisma
model User {
  id        String   @id @default(uuid()) @db.Uuid
  email     String   @unique
  // ... add new fields or modify existing ones
}
```

### 2. Generate Migration Files

After modifying the schema, create a new migration by running:

```bash
pnpm exec prisma migrate dev --name <migration_name>
```

**Example:**

```bash
pnpm exec prisma migrate dev --name add_user_phone_field
```

This command will:

1. Create SQL migration files in `apps/api/prisma/migrations/`
2. Apply the migration to your local development database
3. Regenerate the Prisma Client

### 3. Review the Generated Migration

Always review the generated SQL file to ensure it matches your expectations. The migration file will be located at:

```
apps/api/prisma/migrations/<timestamp>_<migration_name>/migration.sql
```

### 4. Commit the Migration

Commit both the schema changes and the generated migration files:

```bash
git add apps/api/prisma/schema.prisma
git add apps/api/prisma/migrations/
git commit -m "feat: add user phone field migration"
```

## Automatic Deployment

The project includes a GitHub Actions workflow (`.github/workflows/deploy.yml`) that automatically runs migrations when code is pushed to specific branches.

### Workflow Configuration

The workflow:

- Triggers on pushes to `main` and `staging` branches
- Checks out the code
- Installs dependencies with pnpm
- Runs `prisma migrate deploy` with the `DATABASE_URL` from GitHub Secrets

### Required GitHub Secrets

Ensure the following secret is configured in your GitHub repository settings:

- `DATABASE_URL`: PostgreSQL connection string for your production/staging database

**Example format:**

```
postgresql://username:password@hostname:5432/database_name?schema=public
```

### How It Works

When you push to `main` or `staging`:

1. GitHub Actions workflow starts
2. Dependencies are installed
3. The command `DATABASE_URL=${{ secrets.DATABASE_URL }} pnpm exec prisma migrate deploy` is executed
4. Prisma applies all pending migrations to the target database

## Working with Migrations Locally

### Apply All Pending Migrations

```bash
pnpm exec prisma migrate deploy
```

### Reset Database (Development Only)

⚠️ **Warning:** This will delete all data in your database.

```bash
pnpm exec prisma migrate reset
```

This command will:

1. Drop the database
2. Create a new database
3. Apply all migrations
4. Run the seed script (if configured)

### Check Migration Status

```bash
pnpm exec prisma migrate status
```

This shows which migrations have been applied and which are pending.

### Generate Prisma Client

If you pull changes that include schema updates but no new migrations, regenerate the Prisma Client:

```bash
pnpm exec prisma generate
```

## Docker Environment

When using Docker Compose for local development:

```bash
# Apply migrations
docker compose exec backend pnpm exec prisma migrate deploy

# Generate Prisma Client
docker compose exec backend pnpm exec prisma generate

# Seed the database
docker compose exec backend pnpm exec prisma db seed
```

## Best Practices

1. **Always Test Locally First**: Run `prisma migrate dev` locally before pushing to ensure migrations work correctly.

2. **Descriptive Migration Names**: Use clear, descriptive names for your migrations:
   - ✅ `add_user_role_field`
   - ✅ `create_appointments_table`
   - ❌ `update_schema`
   - ❌ `fix_db`

3. **Review Generated SQL**: Always inspect the generated SQL to verify it matches your intentions.

4. **Backup Production Data**: Before applying migrations to production, ensure you have recent backups.

5. **Small, Incremental Changes**: Break large schema changes into smaller, incremental migrations.

6. **Test in Staging First**: Push to the `staging` branch first to test migrations in a production-like environment.

7. **Avoid Manual Database Changes**: Always use Prisma migrations rather than manually modifying the database schema.

8. **Handle Data Migrations**: For complex data transformations, create custom migration scripts or use Prisma's raw SQL capabilities within migration files.

## Common Commands Reference

```bash
# Create a new migration and apply it locally
pnpm exec prisma migrate dev --name <migration_name>

# Apply all pending migrations (production/staging)
pnpm exec prisma migrate deploy

# Check migration status
pnpm exec prisma migrate status

# Reset database (dev only - destructive!)
pnpm exec prisma migrate reset

# Regenerate Prisma Client
pnpm exec prisma generate

# Seed the database
pnpm exec prisma db seed

# Open Prisma Studio (database GUI)
pnpm exec prisma studio
```

## Troubleshooting

### Migration Failed in CI/CD

1. Check the GitHub Actions logs for error messages
2. Verify the `DATABASE_URL` secret is correctly configured
3. Ensure the database is accessible from GitHub Actions runners
4. Test the migration locally with the same PostgreSQL version

### Migration Conflicts

If you have migration conflicts (multiple developers creating migrations concurrently):

1. Pull the latest changes
2. Delete your local migration files
3. Recreate your migration with `prisma migrate dev`
4. Resolve any merge conflicts

### Prisma Client Out of Sync

If you see errors about Prisma Client being out of sync:

```bash
pnpm exec prisma generate
```

## Additional Resources

- [Prisma Migrate Documentation](https://www.prisma.io/docs/concepts/components/prisma-migrate)
- [Prisma Schema Reference](https://www.prisma.io/docs/reference/api-reference/prisma-schema-reference)
- [Production Troubleshooting Guide](https://www.prisma.io/docs/guides/migrate/production-troubleshooting)
