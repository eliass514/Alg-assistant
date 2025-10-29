# Secrets Management Strategy

This document outlines the comprehensive strategy for managing sensitive information (secrets) across all environments in this monorepo.

## 🔐 Core Principles

1. **NEVER commit secrets to Git** - All secrets must be excluded from version control
2. **Use environment-specific management** - Different tools for different environments
3. **Least privilege access** - Only grant necessary permissions to secrets
4. **Regular rotation** - Periodically rotate secrets, especially in production
5. **Audit and monitor** - Track access to sensitive information

---

## 📋 Application Secrets Inventory

This application requires the following categories of secrets:

### 1. Database Credentials

| Secret                   | Description                     | Example Value (Dev Only)                   | Required |
| ------------------------ | ------------------------------- | ------------------------------------------ | -------- |
| `DATABASE_URL`           | PostgreSQL connection string    | `postgresql://user:pass@host:5432/db`      | ✅ Yes   |
| `TEST_DATABASE_URL`      | Test database connection string | `postgresql://user:pass@host:5433/test_db` | Optional |
| `POSTGRES_USER`          | Database username               | `acme`                                     | ✅ Yes   |
| `POSTGRES_PASSWORD`      | Database password               | `acme123`                                  | ✅ Yes   |
| `POSTGRES_DB`            | Database name                   | `acme_dev`                                 | ✅ Yes   |
| `POSTGRES_TEST_USER`     | Test database username          | `acme`                                     | Optional |
| `POSTGRES_TEST_PASSWORD` | Test database password          | `acme123`                                  | Optional |
| `POSTGRES_TEST_DB`       | Test database name              | `acme_test`                                | Optional |

### 2. Authentication & Security

| Secret                     | Description                       | Example Generation        | Required |
| -------------------------- | --------------------------------- | ------------------------- | -------- |
| `JWT_ACCESS_TOKEN_SECRET`  | Secret for signing access tokens  | `openssl rand -base64 32` | ✅ Yes   |
| `JWT_REFRESH_TOKEN_SECRET` | Secret for signing refresh tokens | `openssl rand -base64 32` | ✅ Yes   |

**Generation Command:**

```bash
# Generate a secure 256-bit secret
openssl rand -base64 32
```

### 3. AWS S3 / Cloud Storage

| Secret                  | Description               | Example Value               | Required |
| ----------------------- | ------------------------- | --------------------------- | -------- |
| `AWS_ACCESS_KEY_ID`     | AWS IAM access key ID     | `AKIAIOSFODNN7EXAMPLE`      | ✅ Yes   |
| `AWS_SECRET_ACCESS_KEY` | AWS IAM secret access key | `wJalrXUtnFEMI/K7MDENG/...` | ✅ Yes   |
| `AWS_S3_BUCKET_NAME`    | S3 bucket name            | `acme-prod-uploads`         | ✅ Yes   |
| `AWS_REGION`            | AWS region                | `us-east-1`                 | ✅ Yes   |

### 4. LLM Provider API Keys

| Secret                  | Description                | Required                |
| ----------------------- | -------------------------- | ----------------------- |
| `OPENAI_API_KEY`        | OpenAI API key             | When using OpenAI       |
| `OPENAI_ORG_ID`         | OpenAI organization ID     | When using OpenAI       |
| `ANTHROPIC_API_KEY`     | Anthropic (Claude) API key | When using Anthropic    |
| `AZURE_OPENAI_API_KEY`  | Azure OpenAI API key       | When using Azure OpenAI |
| `AZURE_OPENAI_ENDPOINT` | Azure OpenAI endpoint URL  | When using Azure OpenAI |

### 5. Third-Party Service Keys (Future)

| Secret              | Description               | Required                     |
| ------------------- | ------------------------- | ---------------------------- |
| `STRIPE_SECRET_KEY` | Stripe payment processing | If payment integration added |
| `SENDGRID_API_KEY`  | SendGrid email service    | If email service added       |
| `SENTRY_DSN`        | Sentry error tracking     | If Sentry monitoring added   |

---

## 🌍 Environment-Specific Management

### Local Development

**Method:** `.env` files (gitignored)

**Setup:**

1. Copy the development example file:

   ```bash
   cp .env.development.example .env
   ```

2. Update values for your local environment:

   ```bash
   # Edit .env file with your local values
   vim .env
   ```

3. For Docker Compose development:
   ```bash
   # The docker-compose.yml reads from .env automatically
   docker-compose up
   ```

**Key Points:**

- ✅ `.env` files are listed in `.gitignore` and will never be committed
- ✅ Use weak/simple secrets for local development (e.g., `acme123`)
- ✅ Use MinIO for local S3 development (credentials: `minioadmin`/`minioadmin`)
- ✅ Use `LLM_PROVIDER=mock` to avoid needing real API keys during development

**Security Note:** Even in development, never use production credentials locally.

---

### CI/CD (GitHub Actions)

**Method:** GitHub Encrypted Secrets

**Setup:**

1. Navigate to your GitHub repository
2. Go to **Settings** → **Secrets and variables** → **Actions**
3. Add the following repository secrets:

#### Required Secrets for CI:

| Secret Name                | Description                 | When Needed              |
| -------------------------- | --------------------------- | ------------------------ |
| `DATABASE_URL`             | Test/CI database connection | For integration tests    |
| `JWT_ACCESS_TOKEN_SECRET`  | JWT signing secret          | For authentication tests |
| `JWT_REFRESH_TOKEN_SECRET` | JWT refresh signing secret  | For authentication tests |

#### Required Secrets for CD (Deployment):

| Secret Name             | Description                    | When Needed             |
| ----------------------- | ------------------------------ | ----------------------- |
| `PROD_DATABASE_URL`     | Production database URL        | Deploying to production |
| `STAGING_DATABASE_URL`  | Staging database URL           | Deploying to staging    |
| `AWS_ACCESS_KEY_ID`     | AWS credentials for deployment | If deploying to AWS     |
| `AWS_SECRET_ACCESS_KEY` | AWS secret key                 | If deploying to AWS     |
| `DOCKER_USERNAME`       | Docker Hub username            | If pushing images       |
| `DOCKER_PASSWORD`       | Docker Hub password/token      | If pushing images       |

**Usage in Workflows:**

```yaml
# Example from .github/workflows/deploy.yml
steps:
  - name: Run Database Migration
    env:
      DATABASE_URL: ${{ secrets.DATABASE_URL }}
    run: pnpm exec prisma migrate deploy

  - name: Deploy to Production
    env:
      AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
      AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
    run: ./deploy.sh
```

**Best Practices:**

- ✅ Use separate secrets for different environments (dev/staging/prod)
- ✅ Rotate secrets regularly and update GitHub Secrets accordingly
- ✅ Use environment-specific secrets when deploying to multiple environments
- ✅ Never echo or log secret values in CI logs

**Documentation:** [GitHub Actions - Encrypted Secrets](https://docs.github.com/en/actions/security-guides/encrypted-secrets)

---

### Production / Staging Deployment

The deployment strategy depends on your hosting platform. Choose the appropriate section:

#### Option 1: Vercel (Recommended for Next.js Frontend)

**Method:** Vercel Environment Variables

**Setup:**

1. Via Vercel Dashboard:
   - Go to **Project Settings** → **Environment Variables**
   - Add variables for Production, Preview, and Development

2. Via Vercel CLI:
   ```bash
   vercel env add DATABASE_URL production
   vercel env add JWT_ACCESS_TOKEN_SECRET production
   ```

**Environment Types:**

- **Production**: Used for production deployments (main branch)
- **Preview**: Used for preview deployments (PRs)
- **Development**: Used for local development with `vercel dev`

**Best Practices:**

- ✅ Use different values for Production vs Preview
- ✅ Set `NEXT_PUBLIC_*` variables carefully (they're exposed to browser)
- ✅ Use Vercel's built-in encryption

**Documentation:** [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)

---

#### Option 2: Render (Backend + Database)

**Method:** Render Environment Variables & Secret Files

**Setup:**

1. Via Render Dashboard:
   - Go to your service → **Environment** tab
   - Add environment variables as key-value pairs

2. For Secret Files (e.g., service account JSON):
   - Use **Secret Files** feature
   - Mount files at specified paths

**Environment Groups:**
Create shared environment groups for common secrets:

```bash
# Shared across multiple services
DATABASE_URL
JWT_ACCESS_TOKEN_SECRET
AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY
```

**Best Practices:**

- ✅ Use Render's Environment Groups for shared secrets
- ✅ Enable "Auto-deploy" for automatic deployments
- ✅ Use separate services for staging and production

**Documentation:** [Render Environment Variables](https://render.com/docs/configure-environment-variables)

---

#### Option 3: AWS (ECS/Fargate/EC2)

**Method:** AWS Secrets Manager + Parameter Store

**Setup:**

1. Store secrets in AWS Secrets Manager:

   ```bash
   # Store a secret
   aws secretsmanager create-secret \
     --name acme-prod-db-password \
     --secret-string "your-secret-value"
   ```

2. Grant ECS task IAM role permission to read secrets:

   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Effect": "Allow",
         "Action": ["secretsmanager:GetSecretValue", "kms:Decrypt"],
         "Resource": ["arn:aws:secretsmanager:us-east-1:123456789:secret:acme-prod-*"]
       }
     ]
   }
   ```

3. Reference in ECS task definition:
   ```json
   {
     "containerDefinitions": [
       {
         "secrets": [
           {
             "name": "DATABASE_URL",
             "valueFrom": "arn:aws:secretsmanager:us-east-1:123456789:secret:acme-prod-db-url"
           }
         ]
       }
     ]
   }
   ```

**Cost Optimization:**

- Use **Parameter Store** (free tier) for non-sensitive configuration
- Use **Secrets Manager** ($0.40/secret/month) for sensitive data with rotation

**Best Practices:**

- ✅ Enable automatic secret rotation
- ✅ Use IAM roles, not access keys, for AWS resources
- ✅ Tag secrets by environment and application
- ✅ Enable CloudWatch logging for secret access

**Documentation:**

- [AWS Secrets Manager](https://docs.aws.amazon.com/secretsmanager/)
- [ECS Secrets](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/specifying-sensitive-data.html)

---

#### Option 4: Kubernetes (Self-Hosted/EKS/GKE/AKS)

**Method:** Kubernetes Secrets + External Secrets Operator

**Setup:**

1. Create Kubernetes Secret:

   ```bash
   # From literal values
   kubectl create secret generic app-secrets \
     --from-literal=DATABASE_URL='postgresql://...' \
     --from-literal=JWT_ACCESS_TOKEN_SECRET='...' \
     -n production

   # From .env file (never commit this file!)
   kubectl create secret generic app-secrets \
     --from-env-file=.env.production \
     -n production
   ```

2. Mount in deployment:

   ```yaml
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

3. **Advanced: External Secrets Operator** (Recommended)
   - Syncs secrets from external providers (AWS Secrets Manager, Vault, etc.)
   - Prevents secrets from living in Kubernetes manifests

   ```yaml
   apiVersion: external-secrets.io/v1beta1
   kind: ExternalSecret
   metadata:
     name: app-secrets
   spec:
     refreshInterval: 1h
     secretStoreRef:
       name: aws-secrets-manager
       kind: SecretStore
     target:
       name: app-secrets
     data:
       - secretKey: DATABASE_URL
         remoteRef:
           key: acme-prod-database-url
   ```

**Best Practices:**

- ✅ Use External Secrets Operator for production
- ✅ Encrypt secrets at rest (enable encryption in etcd)
- ✅ Use RBAC to restrict secret access
- ✅ Never commit Kubernetes secret manifests with actual values

**Documentation:**

- [Kubernetes Secrets](https://kubernetes.io/docs/concepts/configuration/secret/)
- [External Secrets Operator](https://external-secrets.io/)

---

#### Option 5: Docker Compose (Simple Production)

**Method:** Docker Secrets + Environment Files

**Setup:**

1. Use Docker secrets (Swarm mode):

   ```bash
   # Create secret
   echo "my-secret-value" | docker secret create db_password -
   ```

2. Or use `.env` file with proper permissions:

   ```bash
   # Create production .env file (NOT in Git)
   touch .env.production
   chmod 600 .env.production

   # Reference in docker-compose
   docker-compose --env-file .env.production up -d
   ```

**Best Practices:**

- ✅ Store `.env.production` outside the repository
- ✅ Use strict file permissions (600)
- ✅ Consider using Docker secrets for sensitive data

---

## 🚫 What Should NEVER Be Committed

The following patterns are already in `.gitignore`:

```
.env
.env.local
.env.development
.env.development.local
.env.staging
.env.staging.local
.env.production
.env.production.local
.env*.local
```

### ⚠️ Committed Files (Safe - Examples Only)

The following files are **intentionally committed** and contain **only example values**:

- ✅ `.env.example` - Base example with placeholder values
- ✅ `.env.development.example` - Development example with safe defaults
- ✅ `.env.production.example` - Production template with placeholder values

**These files should NEVER contain real secrets!**

---

## 🔄 Secret Rotation Strategy

### JWT Secrets

- **Frequency:** Every 90 days or on security incident
- **Process:**
  1. Generate new secret: `openssl rand -base64 32`
  2. Update in secrets management system
  3. Deploy updated secret to all environments
  4. Monitor for authentication failures

### Database Credentials

- **Frequency:** Every 6 months or on security incident
- **Process:**
  1. Create new database user with same permissions
  2. Update `DATABASE_URL` in secrets management
  3. Deploy and verify connectivity
  4. Remove old database user

### API Keys (OpenAI, AWS, etc.)

- **Frequency:** Every 6-12 months or on security incident
- **Process:**
  1. Generate new key in provider console
  2. Update in secrets management system
  3. Deploy and verify functionality
  4. Revoke old key after validation

---

## 🔍 Security Best Practices

### 1. Audit Access

- Review who has access to production secrets quarterly
- Use cloud provider audit logs (CloudTrail, GCP Audit Logs)
- Monitor for unusual secret access patterns

### 2. Principle of Least Privilege

- Grant secret access only to services that need them
- Use separate credentials for different services
- Avoid sharing secrets across environments

### 3. Detection and Response

- Set up alerts for secret exposure in public repositories
- Use tools like [GitGuardian](https://www.gitguardian.com/) or [TruffleHog](https://github.com/trufflesecurity/trufflehog)
- Have an incident response plan for exposed secrets

### 4. Developer Best Practices

- Use `.env.development.example` for local setup
- Never copy production credentials to local machine
- Use `mock` mode for external services during development
- Enable pre-commit hooks to prevent accidental commits

---

## 🆘 What To Do If a Secret Is Exposed

If you accidentally commit a secret to Git:

### Immediate Actions

1. **Revoke the secret immediately**
   - Rotate database passwords
   - Regenerate API keys
   - Invalidate JWT secrets

2. **Remove from Git history**

   ```bash
   # WARNING: This rewrites history
   git filter-branch --force --index-filter \
     "git rm --cached --ignore-unmatch .env" \
     --prune-empty --tag-name-filter cat -- --all

   # Force push (coordinate with team!)
   git push origin --force --all
   ```

3. **Notify your team**
   - Alert all developers
   - Document in incident log
   - Review access logs

4. **Update secrets management**
   - Generate new secrets
   - Update all environments
   - Verify services are working

### Prevention

- Enable pre-commit hooks (already configured in this repo)
- Use `.gitignore` (already configured)
- Review changes before committing
- Consider using [git-secrets](https://github.com/awslabs/git-secrets)

---

## 📚 Additional Resources

- [OWASP Secrets Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html)
- [12 Factor App - Config](https://12factor.net/config)
- [Environment Variables Documentation](./ENVIRONMENT_VARIABLES.md) - Comprehensive guide to all environment variables
- [Prisma Migrations Documentation](./PRISMA_MIGRATIONS.md) - Database migration strategy

---

## 🔄 Related Documentation

- **[ENVIRONMENT_VARIABLES.md](./ENVIRONMENT_VARIABLES.md)** - Detailed configuration guide
- **[PRISMA_MIGRATIONS.md](./PRISMA_MIGRATIONS.md)** - Database migrations
- **[README.md](../README.md)** - Project overview

---

## ✅ Checklist for New Environments

When setting up a new environment (staging/production), ensure:

- [ ] All required secrets are defined (see Inventory section)
- [ ] Secrets are stored in appropriate management system
- [ ] `.env` files are in `.gitignore`
- [ ] Strong, unique secrets generated for production
- [ ] Database credentials use least privilege
- [ ] JWT secrets are at least 256 bits
- [ ] AWS IAM roles/users follow least privilege
- [ ] Secrets rotation schedule is documented
- [ ] Team members know how to access secrets
- [ ] Monitoring and alerts are configured
- [ ] Backup/disaster recovery includes secrets

---

**Last Updated:** 2024-10-29  
**Maintained By:** Development Team  
**Review Frequency:** Quarterly or after security incidents
