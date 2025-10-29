# Environment Variable Strategy

This document outlines the strategy for managing environment-specific configuration across development, staging, and production environments in this monorepo.

## Table of Contents

- [Overview](#overview)
- [Environment Variable Loading](#environment-variable-loading)
- [Configuration by Application](#configuration-by-application)
- [Environment Files](#environment-files)
- [Docker and Container Deployment](#docker-and-container-deployment)
- [Production Deployment](#production-deployment)
- [Security Best Practices](#security-best-practices)
- [Troubleshooting](#troubleshooting)

## Overview

This application uses a hierarchical environment variable strategy:

1. **Development**: `.env` files loaded locally or mounted into Docker containers
2. **Staging/Production**: Platform-managed secrets (AWS Secrets Manager, ECS/Fargate environment variables, Kubernetes secrets, etc.)

### Key Principles

- **Never commit secrets** to version control
- Use `.env.example` as a template for required variables
- Environment-specific files (`.env.development`, `.env.production`) provide complete examples but are gitignored
- Backend (NestJS) uses `ConfigModule` with validation and type-safe configuration
- Frontend (Next.js) uses environment variables with proper `NEXT_PUBLIC_` prefixes for client-side access

## Environment Variable Loading

### Backend (NestJS)

The backend uses NestJS's `@nestjs/config` package with the `ConfigModule` configured in `apps/api/src/app.module.ts`:

```typescript
ConfigModule.forRoot({
  isGlobal: true, // Makes config available throughout the app
  cache: true, // Caches config values for performance
  expandVariables: true, // Allows ${VAR} expansion in .env files
  envFilePath: [
    // Loads env files in order of precedence
    '.env',
    '.env.local',
    '../../.env',
    '../../.env.local',
  ],
  load: [
    // Custom configuration namespaces
    appConfig,
    authConfig,
    storageConfig,
    llmConfig,
  ],
});
```

**Configuration Files:**

- `apps/api/src/config/app.config.ts` - Application settings (port, environment, etc.)
- `apps/api/src/config/auth.config.ts` - JWT and authentication settings
- `apps/api/src/config/storage.config.ts` - AWS S3 configuration
- `apps/api/src/config/llm.config.ts` - LLM provider configuration

**Usage Example:**

```typescript
import { ConfigService } from '@nestjs/config';
import { AuthConfig } from '@config/auth.config';

constructor(private configService: ConfigService) {}

getJwtSecret(): string {
  const authConfig = this.configService.get<AuthConfig>('auth', { infer: true });
  return authConfig.accessTokenSecret;
}
```

### Frontend (Next.js)

Next.js has two types of environment variables:

1. **Server-side only**: `process.env.VARIABLE_NAME` - Only available during build and on the server
2. **Client-side**: `process.env.NEXT_PUBLIC_VARIABLE_NAME` - Exposed to the browser (use sparingly, never for secrets)

**Key Variables:**

- `API_BASE_URL` - Used server-side for SSR API calls (e.g., `http://backend:3000/api` in Docker)
- `NEXT_PUBLIC_API_BASE_URL` - Used client-side for browser API calls (e.g., `http://localhost:8080/api`)

**Runtime Configuration:**

The frontend uses environment variables directly via `process.env`. For client-side access, variables must be prefixed with `NEXT_PUBLIC_`:

```typescript
// Server-side (SSR, API routes)
const apiUrl = process.env.API_BASE_URL ?? 'http://localhost:3001/api';

// Client-side (browser)
const publicApiUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8080/api';
```

**Configuration Helper:**

- `apps/web/src/lib/config.ts` provides typed access to runtime configuration and enforces required variables for both server and client environments.

**Reference:** `apps/web/src/lib/api/client.ts`

## Configuration by Application

### Backend API (NestJS)

| Variable                       | Description                         | Default       | Required     |
| ------------------------------ | ----------------------------------- | ------------- | ------------ |
| `NODE_ENV`                     | Runtime environment                 | `development` | Yes          |
| `PORT`                         | Server port                         | `3000`        | No           |
| `APP_NAME`                     | Application name                    | `Acme API`    | No           |
| `GLOBAL_PREFIX`                | API path prefix                     | `api`         | No           |
| `DATABASE_URL`                 | PostgreSQL connection string        | -             | Yes          |
| `JWT_ACCESS_TOKEN_SECRET`      | JWT signing secret                  | -             | Yes          |
| `JWT_ACCESS_TOKEN_EXPIRES_IN`  | Access token TTL (seconds)          | `900`         | No           |
| `JWT_REFRESH_TOKEN_SECRET`     | Refresh token secret                | -             | Yes          |
| `JWT_REFRESH_TOKEN_EXPIRES_IN` | Refresh token TTL (seconds)         | `604800`      | No           |
| `JWT_AUDIENCE`                 | JWT audience claim                  | `acme.api`    | No           |
| `JWT_ISSUER`                   | JWT issuer claim                    | `acme.api`    | No           |
| `BCRYPT_SALT_ROUNDS`           | Password hashing rounds             | `10`          | No           |
| `DEFAULT_USER_ROLE`            | Default role for new users          | `client`      | No           |
| `AWS_REGION`                   | AWS region for S3                   | `us-east-1`   | Yes (for S3) |
| `AWS_ACCESS_KEY_ID`            | AWS access key                      | -             | Yes (for S3) |
| `AWS_SECRET_ACCESS_KEY`        | AWS secret key                      | -             | Yes (for S3) |
| `AWS_S3_BUCKET_NAME`           | S3 bucket name                      | -             | Yes (for S3) |
| `AWS_S3_ENDPOINT`              | Custom S3 endpoint (optional)       | -             | No           |
| `AWS_S3_FORCE_PATH_STYLE`      | Use path-style URLs                 | `false`       | No           |
| `S3_PRESIGNED_URL_EXPIRATION`  | Presigned URL TTL (seconds)         | `3600`        | No           |
| `LLM_PROVIDER`                 | LLM provider type                   | `mock`        | No           |
| `LLM_DEFAULT_LOCALE`           | Default locale for LLM              | `en`          | No           |
| `LLM_SUPPORTED_LOCALES`        | Supported locales (comma-separated) | `en,fr,ar`    | No           |
| `LLM_MAX_PROMPT_LENGTH`        | Max prompt length                   | `1200`        | No           |
| `LLM_MAX_CONTEXT_MESSAGES`     | Max context messages                | `25`          | No           |
| `LLM_GUARDRAILS_BLOCKED`       | Blocked phrases (comma-separated)   | -             | No           |

### Frontend Web (Next.js)

| Variable                   | Description         | Default       | Required | Client-Side |
| -------------------------- | ------------------- | ------------- | -------- | ----------- |
| `NODE_ENV`                 | Runtime environment | `development` | Yes      | No          |
| `PORT`                     | Server port         | `3000`        | No       | No          |
| `API_BASE_URL`             | Server-side API URL | -             | Yes      | No          |
| `NEXT_PUBLIC_API_BASE_URL` | Client-side API URL | -             | Yes      | Yes         |

## Environment Files

### File Hierarchy

1. **`.env.example`** - Template with all required variables (committed to git)
2. **`.env.development.example`** - Development-specific example (committed to git)
3. **`.env.production.example`** - Production-specific example (committed to git)
4. **`.env`** - Local environment file (gitignored, user-created)
5. **`.env.local`** - Local overrides (gitignored, highest precedence)
6. **`.env.development`** - Development environment (gitignored)
7. **`.env.production`** - Production environment (gitignored)

### Loading Priority

Environment variables are loaded in the following order (later sources override earlier ones):

1. System environment variables
2. `.env.production` or `.env.development` (based on `NODE_ENV`)
3. `.env.local` (not loaded for test environment)
4. `.env`

### Creating Your Local Environment

For local development:

```bash
# Option 1: Start from the example
cp .env.example .env

# Option 2: Use the development-specific example
cp .env.development.example .env

# Edit with your local values
vim .env
```

## Docker and Container Deployment

### Local Development with Docker Compose

The `docker-compose.yml` file orchestrates the full stack using environment variables from your `.env` file:

```yaml
services:
  backend:
    environment:
      NODE_ENV: ${NODE_ENV:-development}
      DATABASE_URL: postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@db:5432/${POSTGRES_DB}
      JWT_ACCESS_TOKEN_SECRET: ${JWT_ACCESS_TOKEN_SECRET:-change-me-access}
      # ... other variables
```

**How it works:**

1. Create a `.env` file at the repository root (or use `.env.development`)
2. Docker Compose automatically loads variables from `.env`
3. Variables are passed to containers via the `environment:` directive
4. Syntax: `${VAR:-default}` uses the value from `.env` or falls back to `default`

**Start the stack:**

```bash
# Ensure you have a .env file
cp .env.example .env

# Start all services
docker compose up -d

# View logs
docker compose logs -f backend
```

**Service-to-Service Communication:**

- Backend connects to database using service name: `postgresql://user:pass@db:5432/dbname`
- Frontend connects to backend using service name: `http://backend:3000/api`
- External access goes through nginx proxy on port 8080

### Container Environment Best Practices

**DO:**

- Use environment variables for all configuration
- Set defaults in code for non-sensitive values
- Use Docker Compose's `env_file:` directive for multiple env files
- Document required vs. optional variables

**DON'T:**

- Hardcode secrets in Dockerfiles
- Commit `.env` files with real credentials
- Use ARG for runtime secrets (they're visible in image layers)

### Example: Multi-Environment Docker Compose

```bash
# Development
docker compose --env-file .env.development up

# Staging
docker compose --env-file .env.staging up

# Production (typically not used - see Production Deployment section)
docker compose --env-file .env.production up
```

## Production Deployment

**Never use `.env` files in production.** Instead, use your cloud platform's secret management:

### AWS ECS/Fargate

**Option 1: Environment Variables**

```json
{
  "containerDefinitions": [
    {
      "name": "api",
      "environment": [
        { "name": "NODE_ENV", "value": "production" },
        { "name": "PORT", "value": "3000" }
      ],
      "secrets": [
        {
          "name": "DATABASE_URL",
          "valueFrom": "arn:aws:secretsmanager:region:account:secret:db-url"
        },
        {
          "name": "JWT_ACCESS_TOKEN_SECRET",
          "valueFrom": "arn:aws:secretsmanager:region:account:secret:jwt-secret"
        }
      ]
    }
  ]
}
```

**Option 2: Task Definition with Parameter Store**

```json
{
  "secrets": [
    {
      "name": "DATABASE_URL",
      "valueFrom": "arn:aws:ssm:region:account:parameter/app/database-url"
    }
  ]
}
```

### AWS Elastic Beanstalk

Configure via `.ebextensions/env.config` or through the EB Console:

```yaml
option_settings:
  aws:elasticbeanstalk:application:environment:
    NODE_ENV: production
    JWT_ACCESS_TOKEN_SECRET: '`{"Ref": "JWTSecret"}`'
```

### Kubernetes

**Option 1: Secrets**

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: app-secrets
type: Opaque
data:
  DATABASE_URL: <base64-encoded-value>
  JWT_SECRET: <base64-encoded-value>
---
apiVersion: apps/v1
kind: Deployment
spec:
  template:
    spec:
      containers:
        - name: api
          envFrom:
            - secretRef:
                name: app-secrets
```

**Option 2: ConfigMap (for non-secrets)**

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
data:
  NODE_ENV: 'production'
  PORT: '3000'
---
apiVersion: apps/v1
kind: Deployment
spec:
  template:
    spec:
      containers:
        - name: api
          envFrom:
            - configMapRef:
                name: app-config
```

### Vercel / Netlify

Add environment variables through the dashboard:

1. Go to Project Settings → Environment Variables
2. Add variables with appropriate scopes (Production, Preview, Development)
3. Restart deployments to pick up changes

**Note:** For Next.js on Vercel, `NEXT_PUBLIC_*` variables are inlined at build time.

### Docker Swarm

```bash
# Create secrets
echo "my-secret-value" | docker secret create db_password -

# Use in service
docker service create \
  --name api \
  --secret db_password \
  --env DATABASE_URL="postgresql://user:$(cat /run/secrets/db_password)@db:5432/app" \
  my-api-image
```

## Security Best Practices

### General Guidelines

1. **Never commit secrets to git**
   - Use `.gitignore` for `.env`, `.env.local`, `.env.*.local`
   - Review commits before pushing
   - Use `git-secrets` or similar tools

2. **Use strong secrets**

   ```bash
   # Generate secure random secrets
   openssl rand -base64 32
   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
   ```

3. **Rotate secrets regularly**
   - Change JWT secrets periodically (invalidates all tokens)
   - Rotate AWS credentials
   - Update database passwords

4. **Principle of least privilege**
   - Use separate AWS IAM roles for dev/staging/prod
   - Grant minimal required permissions
   - Use read-only credentials where possible

5. **Audit and monitor**
   - Enable AWS CloudTrail for secret access logs
   - Monitor failed authentication attempts
   - Set up alerts for suspicious activity

### Frontend Security

**Never expose sensitive values to the client:**

```typescript
// ❌ WRONG - Exposes API key to browsers
NEXT_PUBLIC_AWS_SECRET_KEY=abc123

// ✅ CORRECT - Server-side only
AWS_SECRET_KEY=abc123

// ✅ CORRECT - Public values only
NEXT_PUBLIC_API_BASE_URL=https://api.example.com
```

### Validating Environment Variables

The backend uses type-safe configuration with validation. Add validation to config files:

```typescript
// apps/api/src/config/auth.config.ts
export default registerAs<AuthConfig>('auth', () => {
  const accessTokenSecret = process.env.JWT_ACCESS_TOKEN_SECRET;

  if (!accessTokenSecret || accessTokenSecret === 'change-me-access') {
    throw new Error('JWT_ACCESS_TOKEN_SECRET must be set to a secure value in production');
  }

  return {
    accessTokenSecret,
    // ...
  };
});
```

## Troubleshooting

### Environment Variables Not Loading

**Issue:** Variables from `.env` not appearing in the application

**Solutions:**

1. **Check file location**: `.env` should be at the repository root
2. **Restart development server**: Changes to `.env` require restart
3. **Check syntax**: Ensure no spaces around `=`

   ```bash
   # ❌ Wrong
   API_KEY = abc123

   # ✅ Correct
   API_KEY=abc123
   ```

4. **Check for quotes**: Only use quotes for values with spaces

   ```bash
   # Usually not needed
   API_KEY=abc123

   # Use quotes for spaces
   APP_NAME="My App Name"
   ```

### Docker Container Not Seeing Variables

**Issue:** Docker container can't access environment variables

**Solutions:**

1. **Check `.env` file exists**: Docker Compose loads from repository root
2. **Check compose file syntax**: Ensure proper `${VAR}` or `${VAR:-default}` syntax
3. **Check environment in container**:
   ```bash
   docker compose exec backend env | grep DATABASE_URL
   ```
4. **Use env_file directive**:
   ```yaml
   services:
     backend:
       env_file:
         - .env
         - .env.development
   ```

### Next.js Client-Side Variables Not Working

**Issue:** `process.env.VARIABLE` is `undefined` in browser

**Solutions:**

1. **Add NEXT*PUBLIC* prefix**: Only `NEXT_PUBLIC_*` variables are exposed to browser
2. **Restart dev server**: Next.js inlines env vars at build/start time
3. **Check browser console**: Variables are hardcoded, visible in source
4. **For dynamic runtime config**: Use an API endpoint instead

### Database Connection Fails in Docker

**Issue:** Backend can't connect to PostgreSQL

**Solutions:**

1. **Check service name**: Use `db` not `localhost` in `DATABASE_URL`

   ```bash
   # ❌ Wrong (from container)
   DATABASE_URL=postgresql://user:pass@localhost:5432/db

   # ✅ Correct (from container)
   DATABASE_URL=postgresql://user:pass@db:5432/db
   ```

2. **Check network**: Ensure services are on the same Docker network
3. **Wait for DB ready**: Use `depends_on` with health checks
4. **Check credentials**: Ensure `POSTGRES_USER` / `POSTGRES_PASSWORD` match

### Secrets Exposed in Logs

**Issue:** Sensitive values appearing in application logs

**Solutions:**

1. **Never log full config objects**:

   ```typescript
   // ❌ Wrong
   console.log('Config:', config);

   // ✅ Correct
   console.log('Config loaded successfully');
   ```

2. **Sanitize error messages**: Don't include secret values in exceptions
3. **Use log filtering**: Configure logger to redact sensitive fields
4. **Review Docker logs**: `docker compose logs` may contain startup env vars

### Production Build Fails

**Issue:** Missing environment variables during build

**Solutions:**

1. **Check build-time vs runtime**: Some vars needed at build, others at runtime
2. **Set build args**: For Docker, use `ARG` for build-time values (never secrets!)
3. **For Next.js**: `NEXT_PUBLIC_*` vars must be set at build time
4. **Check CI/CD**: Ensure GitHub Actions / pipeline sets required vars

---

## Additional Resources

- [NestJS Configuration Documentation](https://docs.nestjs.com/techniques/configuration)
- [Next.js Environment Variables](https://nextjs.org/docs/basic-features/environment-variables)
- [Docker Compose Environment Variables](https://docs.docker.com/compose/environment-variables/)
- [AWS ECS Secrets](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/specifying-sensitive-data.html)
- [Kubernetes Secrets](https://kubernetes.io/docs/concepts/configuration/secret/)

---

**Questions or Issues?**

If you encounter problems with environment configuration, please:

1. Check this document first
2. Review the `.env.example` file for required variables
3. Verify your `.env` file syntax
4. Check application logs for configuration errors
5. Open an issue with reproduction steps
