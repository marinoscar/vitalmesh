# SSL & Nginx Reverse Proxy Setup for VitalMesh (Dev Environment)

**Note:** This document covers the **development environment** (`vitalmesh.dev.marin.cr`). Production will use a different configuration with its own domain, certificates, and deployment strategy.

## Objective

Deploy VitalMesh behind a two-tier Nginx reverse proxy with automatic SSL certificate management. The setup enables:

- **Wildcard HTTPS** for all `*.dev.marin.cr` subdomains using a single shared Let's Encrypt certificate
- **Zero-downtime certificate renewal** via Certbot with AWS Route53 DNS validation
- **Subdomain-based routing** — VitalMesh runs at `vitalmesh.dev.marin.cr` mapped to Docker Compose on port `8321`
- **Same-origin hosting** — frontend at `/`, API at `/api`, Swagger at `/api/docs`, all through one domain

This guide assumes the shared wildcard infrastructure (DNS, certificate, host Nginx, certbot timer) is already in place from an earlier project (e.g., clipboard). The only new work is registering VitalMesh in the existing map and starting its Docker Compose stack.

## Architecture

```
Internet (HTTPS :443)
│
▼
Host Nginx (SSL termination, wildcard cert for *.dev.marin.cr)
│
│   map $host → $backend_port:
│     clipboard.dev.marin.cr  → 127.0.0.1:8320
│     vitalmesh.dev.marin.cr  → 127.0.0.1:8321    ← this project
│     <new-project>           → 127.0.0.1:<port>
│
▼  127.0.0.1:8321
Docker Compose (bridge network: app-network)
├─ Nginx container (port 80 → exposed as 8321)
│  ├── /api        → API container (NestJS + Fastify, port 3000)
│  ├── /api/docs   → API container (Swagger UI)
│  └── /           → Web container (React + MUI, port 80 prod / 5173 dev)
├─ API container (NestJS + Fastify + Prisma)
├─ Web container (React + MUI)
└─ DB container (PostgreSQL 15)
```

**Key design decisions:**

- SSL terminates at the host level — Docker containers only handle plain HTTP
- The host Nginx `map` block routes subdomains to ports, so adding VitalMesh is a one-line change
- VitalMesh's internal Nginx handles path-based routing between frontend and backend
- Two internal Nginx configs exist: `nginx.conf` (production, web on port 80) and `nginx.dev.conf` (development, Vite on port 5173)
- The optional OTEL stack (`otel.compose.yml`) adds Uptrace and ClickHouse for observability

## Prerequisites

- Ubuntu VPS with root access (tested on Ubuntu 22.04+)
- Domain with DNS managed by AWS Route53 (wildcard `*.dev.marin.cr` already resolves to VPS)
- Nginx installed on the host (`apt install nginx`)
- Certbot installed with Route53 plugin (`apt install certbot python3-certbot-nginx python3-certbot-dns-route53`)
- Docker and Docker Compose installed
- AWS credentials configured for Route53 access (for cert renewal)
- Wildcard SSL certificate already obtained (shared with other `*.dev.marin.cr` projects)

## Step 1: DNS Configuration

Already done. The wildcard `A` record covers all subdomains:

```
Type    Name                    Value
A       dev.marin.cr            144.126.129.254
A       *.dev.marin.cr          144.126.129.254
```

`vitalmesh.dev.marin.cr` resolves to the VPS automatically. No changes needed.

## Step 2: Obtain Wildcard SSL Certificate

Already done. The wildcard certificate at `/etc/letsencrypt/live/dev.marin.cr/` covers `vitalmesh.dev.marin.cr` along with all other `*.dev.marin.cr` subdomains.

Certificate files:

```
/etc/letsencrypt/live/dev.marin.cr/
├── cert.pem        # X.509 certificate
├── privkey.pem     # Private key
├── chain.pem       # Intermediate chain
└── fullchain.pem   # cert + chain (used by Nginx)
```

No changes needed.

## Step 3: Automatic Certificate Renewal

Already configured. Certbot's systemd timer runs `certbot renew` twice daily and handles DNS validation via Route53.

Verify the timer is still active:

```bash
sudo systemctl status certbot.timer
```

Test renewal without actually renewing:

```bash
sudo certbot renew --dry-run
```

No changes needed.

## Step 4: Host Nginx — Add VitalMesh Subdomain

This is the only change required on the host. Add one line to the `map` block in `/etc/nginx/sites-available/dev-wildcard`:

```nginx
map $host $backend_port {
    clipboard.dev.marin.cr    8320;
    vitalmesh.dev.marin.cr    8321;    # ← add this line
    # <new-project>.dev.marin.cr  <port>;
}
```

Test and reload:

```bash
sudo nginx -t && sudo systemctl reload nginx
```

The full host Nginx config (`/etc/nginx/sites-available/dev-wildcard`) is shared across all projects and documented in the clipboard SSL setup guide. The only VitalMesh-specific entry is the line above.

## Step 5: Docker Compose — Internal Nginx + Services

VitalMesh's Docker Compose stack is self-contained under `infra/compose/`. It binds the internal Nginx to `127.0.0.1:8321:80`, matching the host Nginx map entry.

### 5a. Internal Nginx config (production)

File: `infra/nginx/nginx.conf`

The production config routes `/api` to the NestJS backend and `/` to the React static build (served from Nginx on port 80):

```nginx
upstream api_upstream {
    server api:3000;
    keepalive 32;
}

upstream web_upstream {
    server web:80;      # Production: Nginx serving static build
    keepalive 32;
}
```

Both the `/api` and `/` location blocks forward `Upgrade` and `Connection` headers for WebSocket support. The `/api` block also forwards `X-Request-ID` for request tracing correlation.

### 5b. Internal Nginx config (development)

File: `infra/nginx/nginx.dev.conf`

Identical to production except the web upstream targets the Vite dev server for hot module replacement:

```nginx
upstream web_upstream {
    server web:5173;    # Vite dev server for hot reload
    keepalive 32;
}
```

The dev config is swapped in by `dev.compose.yml` at startup.

### 5c. Docker Compose files

**Base** (`infra/compose/base.compose.yml`) — four services:

```yaml
services:
  nginx:
    image: nginx:alpine
    ports:
      - "127.0.0.1:8321:80"           # Bound to localhost only; host Nginx proxies in
    volumes:
      - ../nginx/nginx.conf:/etc/nginx/nginx.conf:ro
    depends_on:
      - api
      - web

  api:
    build:
      context: ../../apps/api
      dockerfile: Dockerfile
    environment:
      - NODE_ENV=${NODE_ENV:-development}
      - PORT=${PORT:-3000}
      - APP_URL=${APP_URL:-http://localhost:8321}
      - POSTGRES_HOST=${POSTGRES_HOST:-db}
      - POSTGRES_PORT=${POSTGRES_PORT:-5432}
      - POSTGRES_USER=${POSTGRES_USER:-postgres}
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD:-postgres}
      - POSTGRES_DB=${POSTGRES_DB:-appdb}
      - JWT_SECRET=${JWT_SECRET}
      - GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID}
      - GOOGLE_CLIENT_SECRET=${GOOGLE_CLIENT_SECRET}
      - GOOGLE_CALLBACK_URL=${GOOGLE_CALLBACK_URL}
      - OTEL_ENABLED=${OTEL_ENABLED:-false}
      - OTEL_EXPORTER_OTLP_ENDPOINT=${OTEL_EXPORTER_OTLP_ENDPOINT}
    depends_on:
      db:
        condition: service_healthy    # Waits for PostgreSQL health check

  web:
    build:
      context: ../../apps/web
      dockerfile: Dockerfile

  db:
    image: postgres:15-alpine
    environment:
      - POSTGRES_USER=${POSTGRES_USER:-postgres}
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD:-postgres}
      - POSTGRES_DB=${POSTGRES_DB:-appdb}
    volumes:
      - postgres-data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER:-postgres}"]
      interval: 5s
      timeout: 5s
      retries: 5

networks:
  app-network:
    driver: bridge

volumes:
  postgres-data:
```

**Development override** (`infra/compose/dev.compose.yml`):

```yaml
services:
  nginx:
    volumes:
      - ../nginx/nginx.dev.conf:/etc/nginx/nginx.conf:ro   # Swap to Vite-aware config
  web:
    build:
      target: development     # Starts Vite dev server with hot reload
```

**Production override** (`infra/compose/prod.compose.yml`):

```yaml
services:
  nginx:
    restart: unless-stopped
  api:
    restart: unless-stopped
    deploy:
      resources:
        limits:
          memory: 512M
          cpus: "1.0"
  web:
    restart: unless-stopped
```

**Observability stack** (`infra/compose/otel.compose.yml`):

Adds Uptrace (trace UI at `http://localhost:14318`), ClickHouse (trace storage), and the OpenTelemetry Collector. Enable by including this file in the compose command. When running, set `OTEL_ENABLED=true` and `OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4318` in `.env`.

## Step 6: Environment Configuration

Copy the template and fill in values:

```bash
cp infra/compose/.env.example infra/compose/.env
```

For the dev environment, update these two variables from their localhost defaults:

```bash
APP_URL=https://vitalmesh.dev.marin.cr
GOOGLE_CALLBACK_URL=https://vitalmesh.dev.marin.cr/api/auth/google/callback
```

Also update the **Google OAuth console** (`https://console.cloud.google.com/apis/credentials`) to add the new callback URL as an authorized redirect URI:

```
https://vitalmesh.dev.marin.cr/api/auth/google/callback
```

Other variables to set before first launch:

```bash
# Required — generate with: openssl rand -base64 32
JWT_SECRET=<strong-random-secret>
COOKIE_SECRET=<strong-random-secret>

# Required for OAuth
GOOGLE_CLIENT_ID=<from-google-console>
GOOGLE_CLIENT_SECRET=<from-google-console>

# Required — first login with this email gets Admin role
INITIAL_ADMIN_EMAIL=admin@example.com

# Required for file storage
S3_BUCKET=<your-bucket>
S3_REGION=us-east-1
AWS_ACCESS_KEY_ID=<key>
AWS_SECRET_ACCESS_KEY=<secret>
```

## Step 7: Launch the Application

All compose commands are run from the repository root.

**Development** (Vite dev server, hot reload):

```bash
docker compose -f infra/compose/base.compose.yml -f infra/compose/dev.compose.yml up --build
```

**Development with observability** (Uptrace UI at `http://localhost:14318`):

```bash
docker compose -f infra/compose/base.compose.yml -f infra/compose/dev.compose.yml -f infra/compose/otel.compose.yml up --build
```

**Production mode** (static build, detached):

```bash
docker compose -f infra/compose/base.compose.yml -f infra/compose/prod.compose.yml up --build -d
```

Verify the stack is serving correctly through the full SSL chain:

```bash
curl https://vitalmesh.dev.marin.cr/api/health/live
# → {"status":"ok"}
```

## Step 8: Database Setup

VitalMesh uses PostgreSQL managed by the `db` container. Unlike SQLite-based projects, the database requires migrations and seeding before the application is usable.

After the stack is running and the `db` container passes its health check, run:

```bash
# Apply all pending Prisma migrations
docker compose -f infra/compose/base.compose.yml -f infra/compose/dev.compose.yml \
  exec api npm run prisma:migrate

# Seed the database (required before first login — creates roles, permissions, initial admin)
docker compose -f infra/compose/base.compose.yml -f infra/compose/dev.compose.yml \
  exec api npm run prisma:seed
```

The seed step is mandatory: it creates the RBAC roles and permissions, and registers `INITIAL_ADMIN_EMAIL` so the first login can succeed.

To verify the database is healthy:

```bash
docker compose -f infra/compose/base.compose.yml -f infra/compose/dev.compose.yml \
  exec db pg_isready -U postgres
# → /var/run/postgresql:5432 - accepting connections
```

## Troubleshooting

**502 Bad Gateway:**
- Docker containers not running. Check `docker compose ps`.
- Port mismatch between host Nginx map (`8321`) and Docker Compose `ports` binding (`127.0.0.1:8321:80`).
- API container still starting. The API waits for the `db` health check, which can take 10–20 seconds on first start.

**SSL certificate errors:**
- Check cert validity: `sudo certbot certificates`
- Test renewal: `sudo certbot renew --dry-run`
- Ensure Route53 credentials are accessible to root at `~/.aws/credentials`.

**Database connection errors:**
- Verify the `db` container is healthy: `docker compose ps` should show `healthy` for the `db` service.
- Check `POSTGRES_HOST=db` in `.env` (must match the service name, not `localhost`).
- Verify `POSTGRES_USER`, `POSTGRES_PASSWORD`, and `POSTGRES_DB` match in both the `api` and `db` service environment sections.

**Migration errors on startup:**
- Ensure the `db` container is fully healthy before running `prisma:migrate`. The API depends on `db` health, but migrations run inside the container after it starts.
- Check migration status: `docker compose exec api npx prisma migrate status`

**OAuth login fails after switching to HTTPS domain:**
- Confirm `APP_URL` and `GOOGLE_CALLBACK_URL` are updated in `.env` (not still pointing to localhost).
- Confirm the new callback URL is added in the Google OAuth console as an authorized redirect URI.

**WebSocket / HMR not working in development:**
- Both Nginx tiers forward `Upgrade` and `Connection` headers. Verify the dev compose is using `nginx.dev.conf` (not the production config).
- Check `proxy_read_timeout` — the Vite HMR connection is long-lived.

**Large file upload failures:**
- Host Nginx: `client_max_body_size 200m` (set in the shared wildcard config).
- Docker Nginx: `client_max_body_size 100m` (set in `nginx.conf` and `nginx.dev.conf`).
- For files above these limits, the API uses presigned S3 URLs for direct browser-to-S3 uploads, bypassing the proxy.

**OTEL / observability not receiving data:**
- Ensure `OTEL_ENABLED=true` in `.env`.
- Ensure `OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4318` (the collector service name, not localhost).
- The OTEL stack must be included in the compose command via `-f infra/compose/otel.compose.yml`.

## File Reference

| File | Purpose |
|------|---------|
| `/etc/nginx/sites-available/dev-wildcard` | Host reverse proxy — subdomain→port mapping (shared across all projects) |
| `/etc/letsencrypt/live/dev.marin.cr/` | Wildcard SSL certificate and key (shared across all `*.dev.marin.cr` projects) |
| `/etc/letsencrypt/renewal/dev.marin.cr.conf` | Certbot renewal config (Route53 DNS) |
| `infra/nginx/nginx.conf` | Docker internal routing — production (web on port 80) |
| `infra/nginx/nginx.dev.conf` | Docker internal routing — development (Vite on port 5173) |
| `infra/compose/base.compose.yml` | Docker Compose base services (nginx, api, web, db) |
| `infra/compose/dev.compose.yml` | Development overrides (hot reload, dev nginx config) |
| `infra/compose/prod.compose.yml` | Production overrides (restart policies, resource limits) |
| `infra/compose/otel.compose.yml` | Observability stack (Uptrace, ClickHouse, OTEL Collector) |
| `infra/compose/.env.example` | Environment variables template |

## Production Note

This entire setup is for the **dev environment** only. Production deployment will use:

- A different domain (not `*.dev.marin.cr`)
- Its own SSL certificate provisioned for that domain
- A dedicated database instance, not a Docker-managed PostgreSQL container
- Managed secrets rather than `.env` files
- Different resource limits and horizontal scaling strategy
- A CI/CD pipeline for zero-downtime deployments

Production configuration will be documented separately.
