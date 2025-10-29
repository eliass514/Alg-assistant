# HTTPS/TLS Configuration Guide

This document provides guidance on configuring HTTPS/TLS encryption for your application in production environments.

## Table of Contents

- [Overview](#overview)
- [Platform-Managed TLS (Recommended)](#platform-managed-tls-recommended)
- [Self-Managed TLS with Reverse Proxy](#self-managed-tls-with-reverse-proxy)
- [Docker Compose HTTPS Setup](#docker-compose-https-setup)
- [Certificate Generation with Let's Encrypt](#certificate-generation-with-lets-encrypt)
- [Testing and Validation](#testing-and-validation)
- [Security Best Practices](#security-best-practices)

## Overview

**HTTPS is typically handled _outside_ your application containers.** This approach provides several benefits:

- **Separation of concerns**: Your application code remains transport-agnostic
- **Easier certificate management**: Certificates can be rotated without redeploying application containers
- **Performance**: Dedicated TLS termination can be optimized independently
- **Flexibility**: Switch hosting providers or proxy solutions without changing application code

There are two main approaches to implementing HTTPS:

1. **Platform-Managed TLS** (Recommended): Let your hosting platform handle TLS automatically
2. **Self-Managed TLS**: Configure a reverse proxy (nginx, Traefik, etc.) to handle TLS termination

## Platform-Managed TLS (Recommended)

Most modern hosting platforms automatically provision and manage TLS certificates for you. This is the simplest and most reliable option.

### Vercel

Vercel automatically provisions and renews TLS certificates for all deployments, including custom domains.

**Setup:**

1. Deploy your frontend to Vercel
2. Add your custom domain in the Vercel dashboard
3. Configure DNS records as instructed
4. TLS is automatically enabled

**Environment Variables:**

```bash
# Frontend (.env.production)
NEXT_PUBLIC_API_BASE_URL=https://api.yourdomain.com/api

# Backend should be deployed separately (e.g., Render, Railway)
```

### Render

Render provides free TLS certificates for all services with custom domains.

**Setup:**

1. Deploy your backend and frontend as separate services
2. Add custom domains in the Render dashboard
3. Update DNS records as instructed
4. TLS is automatically provisioned via Let's Encrypt

**Example Configuration:**

```yaml
# render.yaml
services:
  - type: web
    name: api
    env: docker
    dockerfilePath: ./apps/api/Dockerfile
    envVars:
      - key: NODE_ENV
        value: production
      - key: DATABASE_URL
        fromDatabase:
          name: postgres
          property: connectionString
    # Custom domain with automatic TLS
    domains:
      - api.yourdomain.com

  - type: web
    name: frontend
    env: docker
    dockerfilePath: ./apps/web/Dockerfile
    envVars:
      - key: NODE_ENV
        value: production
      - key: NEXT_PUBLIC_API_BASE_URL
        value: https://api.yourdomain.com/api
    domains:
      - yourdomain.com
```

### Railway

Railway automatically provisions TLS certificates for custom domains.

**Setup:**

1. Deploy your services to Railway
2. Add custom domains in the Railway dashboard
3. Configure DNS (A/CNAME records)
4. TLS is automatically configured

### AWS (ECS/Fargate with ALB)

Use Application Load Balancer (ALB) to terminate TLS before traffic reaches your containers.

**Setup:**

1. Request or import a certificate in AWS Certificate Manager (ACM)
2. Configure ALB with HTTPS listener (port 443) using the ACM certificate
3. Add HTTP listener (port 80) that redirects to HTTPS
4. Configure target groups to route traffic to your ECS services

**Terraform Example:**

```hcl
resource "aws_lb_listener" "https" {
  load_balancer_arn = aws_lb.main.arn
  port              = "443"
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS-1-2-2017-01"
  certificate_arn   = aws_acm_certificate.main.arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.frontend.arn
  }
}

resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.main.arn
  port              = "80"
  protocol          = "HTTP"

  default_action {
    type = "redirect"
    redirect {
      port        = "443"
      protocol    = "HTTPS"
      status_code = "HTTP_301"
    }
  }
}
```

### Kubernetes with Ingress

Use an Ingress controller (nginx-ingress, Traefik) with cert-manager for automatic certificate management.

**Setup:**

1. Install cert-manager in your cluster
2. Configure a ClusterIssuer for Let's Encrypt
3. Create an Ingress resource with TLS annotations
4. cert-manager automatically provisions and renews certificates

**Example Ingress:**

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: app-ingress
  annotations:
    cert-manager.io/cluster-issuer: 'letsencrypt-prod'
    nginx.ingress.kubernetes.io/ssl-redirect: 'true'
spec:
  tls:
    - hosts:
        - yourdomain.com
        - api.yourdomain.com
      secretName: app-tls
  rules:
    - host: yourdomain.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: frontend
                port:
                  number: 3000
    - host: api.yourdomain.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: backend
                port:
                  number: 3000
```

## Self-Managed TLS with Reverse Proxy

If you're deploying to a VPS, bare metal server, or want full control, you can manage TLS certificates yourself using a reverse proxy.

### Why Use a Reverse Proxy?

A reverse proxy sits in front of your application containers and:

- Terminates TLS connections
- Handles HTTP to HTTPS redirects
- Routes requests to appropriate backend services
- Can provide additional features (rate limiting, caching, etc.)

### Popular Reverse Proxy Options

1. **nginx** - Battle-tested, high-performance, widely documented
2. **Traefik** - Modern, Docker-native, automatic service discovery and Let's Encrypt integration
3. **Caddy** - Automatic HTTPS with built-in Let's Encrypt support
4. **HAProxy** - High-performance load balancer with TLS termination

## Docker Compose HTTPS Setup

This section shows how to configure the nginx reverse proxy in `docker-compose.yml` for HTTPS.

### Step 1: Obtain TLS Certificates

Before configuring nginx for HTTPS, you need TLS certificates. See [Certificate Generation with Let's Encrypt](#certificate-generation-with-lets-encrypt) below.

### Step 2: Update docker-compose.yml

Modify the `proxy` service to:

- Expose port 443
- Mount SSL certificate files
- Use the HTTPS-enabled nginx configuration

```yaml
services:
  # ... db, backend, frontend services remain unchanged ...

  proxy:
    image: nginx:1.27-alpine
    restart: unless-stopped
    depends_on:
      frontend:
        condition: service_started
      backend:
        condition: service_started
    volumes:
      # Use the HTTPS configuration
      - ./infra/nginx/default.https.conf:/etc/nginx/conf.d/default.conf:ro
      # Mount Let's Encrypt certificates (adjust path as needed)
      - /etc/letsencrypt:/etc/letsencrypt:ro
      # Optionally mount the certbot webroot for renewals
      - ./certbot/www:/var/www/certbot:ro
    ports:
      - '80:80' # HTTP (will redirect to HTTPS)
      - '443:443' # HTTPS
    networks:
      - app-network
```

### Step 3: Configure nginx for HTTPS

An example nginx configuration is provided at `infra/nginx/default.https.conf.example`. Copy and customize it:

```bash
cp infra/nginx/default.https.conf.example infra/nginx/default.https.conf
```

Edit the file to replace:

- `example.com` with your actual domain
- Certificate paths if your certificates are in a different location

Key sections of the HTTPS nginx config:

**HTTP to HTTPS Redirect:**

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name example.com www.example.com;

    return 301 https://$host$request_uri;
}
```

**HTTPS Server Block:**

```nginx
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name example.com www.example.com;

    # SSL Certificate Configuration
    ssl_certificate     /etc/letsencrypt/live/example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/example.com/privkey.pem;
    ssl_trusted_certificate /etc/letsencrypt/live/example.com/chain.pem;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000" always;

    # ... proxy configurations for /api/ and / ...
}
```

### Step 4: Update Environment Variables

Update your `.env` file to use HTTPS URLs:

```bash
# Frontend environment
NEXT_PUBLIC_API_BASE_URL=https://yourdomain.com/api

# Backend environment (if needed)
FRONTEND_URL=https://yourdomain.com
```

## Certificate Generation with Let's Encrypt

[Let's Encrypt](https://letsencrypt.org/) provides **free, automated TLS certificates** that are trusted by all major browsers.

### Option 1: Using Certbot (Standalone Mode)

**Prerequisites:**

- A domain name pointing to your server's IP address
- Port 80 accessible from the internet (for validation)
- Docker or Certbot installed

**Generate Certificates:**

```bash
# Using Docker (recommended)
docker run -it --rm \
  -v /etc/letsencrypt:/etc/letsencrypt \
  -v /var/lib/letsencrypt:/var/lib/letsencrypt \
  -p 80:80 \
  certbot/certbot certonly \
  --standalone \
  --preferred-challenges http \
  -d yourdomain.com \
  -d www.yourdomain.com \
  --email your-email@example.com \
  --agree-tos \
  --non-interactive

# Or using Certbot installed on the host
sudo certbot certonly \
  --standalone \
  --preferred-challenges http \
  -d yourdomain.com \
  -d www.yourdomain.com \
  --email your-email@example.com \
  --agree-tos
```

Certificates will be stored in `/etc/letsencrypt/live/yourdomain.com/`.

**Certificate Renewal:**

Let's Encrypt certificates expire after 90 days. Set up automatic renewal:

```bash
# Test renewal (dry run)
docker run -it --rm \
  -v /etc/letsencrypt:/etc/letsencrypt \
  -v /var/lib/letsencrypt:/var/lib/letsencrypt \
  -p 80:80 \
  certbot/certbot renew --dry-run

# Set up a cron job to renew certificates
# Add to crontab (crontab -e):
0 0,12 * * * docker run --rm -v /etc/letsencrypt:/etc/letsencrypt -v /var/lib/letsencrypt:/var/lib/letsencrypt -p 80:80 certbot/certbot renew --quiet && docker compose restart proxy
```

### Option 2: Using Certbot with Webroot Plugin

This method allows you to obtain and renew certificates without stopping your web server.

**Step 1: Add Certbot Service to docker-compose.yml**

```yaml
services:
  # ... existing services ...

  certbot:
    image: certbot/certbot:latest
    volumes:
      - /etc/letsencrypt:/etc/letsencrypt
      - /var/lib/letsencrypt:/var/lib/letsencrypt
      - ./certbot/www:/var/www/certbot
    entrypoint: "/bin/sh -c 'trap exit TERM; while :; do certbot renew; sleep 12h & wait $${!}; done;'"
```

**Step 2: Update nginx Configuration**

Add this to your HTTPS nginx config's HTTP server block (before the redirect):

```nginx
server {
    listen 80;
    server_name example.com;

    # Allow Certbot to validate domain ownership
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    # Redirect all other traffic to HTTPS
    location / {
        return 301 https://$host$request_uri;
    }
}
```

**Step 3: Initial Certificate Generation**

```bash
# Create webroot directory
mkdir -p certbot/www

# Obtain certificates
docker compose run --rm certbot certonly \
  --webroot \
  --webroot-path /var/www/certbot \
  -d yourdomain.com \
  -d www.yourdomain.com \
  --email your-email@example.com \
  --agree-tos \
  --non-interactive

# Restart proxy to load new certificates
docker compose restart proxy
```

The certbot service will automatically renew certificates every 12 hours.

### Option 3: Using Traefik (Automatic HTTPS)

Traefik can automatically obtain and renew Let's Encrypt certificates with minimal configuration.

**docker-compose.yml with Traefik:**

```yaml
version: '3.9'

services:
  traefik:
    image: traefik:v2.10
    restart: unless-stopped
    command:
      - '--api.insecure=false'
      - '--providers.docker=true'
      - '--providers.docker.exposedbydefault=false'
      - '--entrypoints.web.address=:80'
      - '--entrypoints.websecure.address=:443'
      - '--certificatesresolvers.letsencrypt.acme.tlschallenge=true'
      - '--certificatesresolvers.letsencrypt.acme.email=your-email@example.com'
      - '--certificatesresolvers.letsencrypt.acme.storage=/letsencrypt/acme.json'
      # Uncomment for staging/testing to avoid rate limits
      # - "--certificatesresolvers.letsencrypt.acme.caserver=https://acme-staging-v02.api.letsencrypt.org/directory"
    ports:
      - '80:80'
      - '443:443'
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - ./letsencrypt:/letsencrypt
    networks:
      - app-network

  backend:
    # ... backend configuration ...
    labels:
      - 'traefik.enable=true'
      - 'traefik.http.routers.backend.rule=Host(`api.yourdomain.com`)'
      - 'traefik.http.routers.backend.entrypoints=websecure'
      - 'traefik.http.routers.backend.tls.certresolver=letsencrypt'
      - 'traefik.http.services.backend.loadbalancer.server.port=3000'

  frontend:
    # ... frontend configuration ...
    labels:
      - 'traefik.enable=true'
      - 'traefik.http.routers.frontend.rule=Host(`yourdomain.com`)'
      - 'traefik.http.routers.frontend.entrypoints=websecure'
      - 'traefik.http.routers.frontend.tls.certresolver=letsencrypt'
      - 'traefik.http.services.frontend.loadbalancer.server.port=3000'
      # Redirect HTTP to HTTPS
      - 'traefik.http.routers.frontend-http.rule=Host(`yourdomain.com`)'
      - 'traefik.http.routers.frontend-http.entrypoints=web'
      - 'traefik.http.routers.frontend-http.middlewares=redirect-to-https'
      - 'traefik.http.middlewares.redirect-to-https.redirectscheme.scheme=https'

networks:
  app-network:
    driver: bridge
```

## Testing and Validation

### Local Testing with Self-Signed Certificates

For development/testing, generate self-signed certificates:

```bash
# Create directory for certificates
mkdir -p infra/nginx/certs

# Generate self-signed certificate (valid for 365 days)
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout infra/nginx/certs/selfsigned.key \
  -out infra/nginx/certs/selfsigned.crt \
  -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"

# Update docker-compose.yml to mount these certificates
# In the proxy service volumes:
#   - ./infra/nginx/certs:/etc/nginx/certs:ro
```

Update your nginx HTTPS config to use:

```nginx
ssl_certificate     /etc/nginx/certs/selfsigned.crt;
ssl_certificate_key /etc/nginx/certs/selfsigned.key;
```

**Note:** Browsers will show a security warning for self-signed certificates. This is expected and safe for local testing.

### Validate TLS Configuration

After deploying with HTTPS:

1. **Test HTTPS Connection:**

   ```bash
   curl -I https://yourdomain.com
   ```

2. **Check Certificate Details:**

   ```bash
   openssl s_client -connect yourdomain.com:443 -servername yourdomain.com
   ```

3. **SSL Labs Test:**
   - Visit [https://www.ssllabs.com/ssltest/](https://www.ssllabs.com/ssltest/)
   - Enter your domain
   - Aim for an A or A+ rating

4. **Test HTTP to HTTPS Redirect:**
   ```bash
   curl -I http://yourdomain.com
   # Should return a 301 redirect to https://yourdomain.com
   ```

## Security Best Practices

### 1. Use Strong TLS Configuration

Modern TLS configuration in nginx:

```nginx
# Use TLS 1.2 and 1.3 only
ssl_protocols TLSv1.2 TLSv1.3;

# Use strong cipher suites
ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:DHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384';
ssl_prefer_server_ciphers off;

# Enable OCSP stapling
ssl_stapling on;
ssl_stapling_verify on;
resolver 8.8.8.8 8.8.4.4 valid=300s;
resolver_timeout 5s;

# Optimize SSL session cache
ssl_session_cache shared:SSL:10m;
ssl_session_timeout 10m;
ssl_session_tickets off;

# Enable HTTP/2
http2 on;
```

### 2. Implement Security Headers

Add these headers to your nginx HTTPS server block:

```nginx
# Force HTTPS for 1 year (including subdomains)
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

# Prevent MIME type sniffing
add_header X-Content-Type-Options "nosniff" always;

# Prevent clickjacking
add_header X-Frame-Options "SAMEORIGIN" always;

# Enable XSS protection
add_header X-XSS-Protection "1; mode=block" always;

# Control referrer information
add_header Referrer-Policy "strict-origin-when-cross-origin" always;

# Content Security Policy (customize for your app)
add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';" always;
```

### 3. Certificate Management

- **Automate renewals**: Set up cron jobs or use tools that auto-renew
- **Monitor expiration**: Set up alerts for certificate expiration (30 days before)
- **Use wildcard certificates** carefully - they can be convenient but if compromised, affect all subdomains
- **Store private keys securely**: Restrict file permissions (chmod 600) and never commit to version control

### 4. Regular Security Audits

- Test your TLS configuration regularly with [SSL Labs](https://www.ssllabs.com/ssltest/)
- Update nginx and TLS libraries to patch vulnerabilities
- Review and update cipher suites as security recommendations evolve
- Monitor for certificate transparency logs

### 5. Firewall Configuration

Only expose necessary ports to the internet:

```bash
# Allow HTTPS
sudo ufw allow 443/tcp

# Allow HTTP (for redirects and Let's Encrypt validation)
sudo ufw allow 80/tcp

# Deny direct access to application ports
sudo ufw deny 3000/tcp
sudo ufw deny 3001/tcp
```

### 6. Use a CDN

Consider using a CDN like Cloudflare, which provides:

- Automatic HTTPS with universal SSL
- DDoS protection
- Global edge caching
- Web Application Firewall (WAF)

## Additional Resources

- [Let's Encrypt Documentation](https://letsencrypt.org/docs/)
- [Mozilla SSL Configuration Generator](https://ssl-config.mozilla.org/)
- [Certbot Documentation](https://certbot.eff.org/docs/)
- [nginx TLS Configuration](https://nginx.org/en/docs/http/configuring_https_servers.html)
- [Traefik Let's Encrypt Documentation](https://doc.traefik.io/traefik/https/acme/)
- [OWASP Transport Layer Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Transport_Layer_Security_Cheat_Sheet.html)

## Need Help?

If you encounter issues:

1. Check nginx error logs: `docker compose logs proxy`
2. Verify DNS is correctly configured: `nslookup yourdomain.com`
3. Ensure ports 80 and 443 are accessible from the internet
4. Test with Let's Encrypt staging servers first to avoid rate limits
5. Consult the [Let's Encrypt Community Forum](https://community.letsencrypt.org/)
