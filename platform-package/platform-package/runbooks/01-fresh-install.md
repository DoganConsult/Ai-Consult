# Runbook 01 — Fresh Install

## Prerequisites

- Node.js >= 20.0.0
- PostgreSQL 16+ with pgvector extension
- Redis 7+
- pnpm 10.33.0+

## Steps

### 1. Clone and configure

```bash
cp config/production.env.example backend/.env
# Edit backend/.env with actual credentials
```

### 2. Install dependencies

```bash
cd backend
pnpm install
```

### 3. Initialize database

```bash
bash scripts/init-db.sh
pnpm run migrate
```

### 4. Build

```bash
pnpm run build
```

### 5. Start

```bash
NODE_ENV=production pnpm start
```

### 6. Verify

```bash
bash scripts/smoke-test.sh http://localhost:3010
```

## Post-install

- Create first tenant via `/api/provisioning`
- Configure SMTP for email delivery
- Set up monitoring (import `ops/monitoring/grafana-dashboard.json`)
- Configure nginx reverse proxy (`ops/nginx/platform.conf`)
