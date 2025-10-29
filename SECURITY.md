# Security Checklist

This project combines a NestJS API (`apps/api`) with a Next.js web frontend (`apps/web`), a PostgreSQL database accessed through Prisma, and containerised workloads orchestrated via Docker Compose. Use this checklist during design discussions, development, code review, and release planning to keep security controls front of mind.

## Application-layer controls

- [ ] **Input validation & sanitisation**  
      Confirm that every request payload is represented by a DTO using `class-validator` / `class-transformer`. Reject unknown properties (`whitelist: true` is already enabled) and avoid custom `plainToClass` conversions that bypass the global validation pipe. When raw user input must be forwarded (e.g., file uploads), validate MIME types and enforce server-side size limits.
- [ ] **Authentication & authorisation**  
      Ensure guards that enforce JWT authentication (`JwtAuthGuard`) and role-based access control (`RolesGuard`) wrap every protected route. Review controller changes for missing `@Roles()` decorators, privilege escalation issues, or logic that trusts client-provided role information.
- [ ] **Rate limiting & CORS**  
      Rate limiting is centralised with `@nestjs/throttler` and CORS with `CorsConfig`. When adding new controllers, verify that they inherit the global settings and never override them with permissive values. Keep the public origin allowlist minimal.
- [ ] **Security headers**  
      Helmet should remain enabled in the NestJS bootstrap (e.g., `app.use(helmet())`) with CSP, HSTS, and frameguard tuned for the frontend. Any changes to headers at the API or proxy layer must be reviewed for regressions.
- [ ] **Error handling & logging**  
      Make sure responses never leak stack traces, validation internals, or secret values. Use structured logging that redacts PII. When adding new exception filters or logging statements, double-check they do not stringify full request bodies or credentials.
- [ ] **Database access**  
      Rely on Prisma's parameterised queries. If raw SQL is required, use `$queryRaw` / `$executeRaw` tagged template literals to prevent injection. Confirm migrations do not introduce overly permissive defaults (e.g., `ON DELETE CASCADE` without justification).

## Secrets & configuration

- [ ] **Secrets management**  
      Follow the strategy in [`docs/SECRETS.md`](docs/SECRETS.md). Never hard-code secrets in code, tests, Dockerfiles, or example configs. Review environment variable additions to ensure they are covered by the documented rotation plan and excluded from version control.
- [ ] **Configuration defaults**  
      Keep development defaults secure (e.g., minimal JWT expirations, mock providers). When introducing new flags, document safe defaults and validate they honour `NODE_ENV` distinctions.

## Dependency & supply-chain hygiene

- [ ] **Library updates**  
      Run `pnpm audit` locally or configure Dependabot / Renovate to surface vulnerable packages. Prioritise resolving `high` and `critical` advisories affecting web, auth, crypto, or ORM dependencies. Review changelogs for breaking changes in NestJS, Next.js, Prisma, and AWS SDK upgrades.
- [ ] **Third-party integrations**  
      Evaluate OAuth scopes, webhook secrets, and SDK configurations before enabling new providers. Prefer server-to-server credentials stored in the secrets manager instead of injecting keys into client bundles.

## Transport & network safeguards

- [ ] **HTTPS enforcement**  
      Production deployments must terminate TLS and enforce HTTPS redirects/HSTS as described in [`docs/HTTPS_GUIDANCE.md`](docs/HTTPS_GUIDANCE.md). Verify nginx / proxy configs force HTTPS and prevent downgrade paths (e.g., disable port 80 except for ACME challenges).
- [ ] **Service-to-service trust boundaries**  
      Lock down internal network access—PostgreSQL, Redis, or other services should not listen on public interfaces. When exposing new ports, document the threat model and required firewall rules.

## Platform & container security

- [ ] **Docker image hardening**  
      Maintain the multi-stage build that produces a minimal runtime image. Ensure the final image continues to run as the non-root `nestjs` user, prune development dependencies, and pin base image digests when releasing. Review any newly added tools for CVE exposure.
- [ ] **Runtime environment**  
      Keep `docker-compose.yml` and Kubernetes manifests free of plaintext secrets. Enforce resource limits and health checks so compromised containers can be detected and rescheduled.

## Operational practices

- [ ] **Monitoring & incident response**  
      Capture authentication events, rate limit violations, and critical errors. Confirm alerting is in place for repeated 5xx responses or abnormal throttling behaviour.
- [ ] **Periodic reviews**  
      Schedule quarterly reviews of RBAC policies, JWT lifetime configurations, dependency scans, and secret rotation status. Document outcomes and follow-up actions.

Treat this checklist as a living document—update it whenever the architecture or threat model evolves. Security considerations belong in every pull request description and release note.
