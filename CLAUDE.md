# ServiceHub

Monorepo (npm workspaces): Express API + React web app, PostgreSQL via Prisma.

## Commands

```bash
npm run db:up        # start Postgres in Docker
npm run db:migrate   # prisma migrate dev (run inside apps/api context via workspace)
npm run db:seed      # seed demo tenant/users/jobs
npm run dev:api      # Express on :4000 (node --watch)
npm run dev:web      # Vite on :5173 (proxies /api -> :4000)
```

## Conventions

- Plain JavaScript (ES modules, `"type": "module"`). No TypeScript anywhere.
- API layers: `routes -> service -> (Prisma)`. Business logic lives in
  `*.service.js`; routes only validate (zod) and delegate.
- Multi-tenant isolation: NEVER query tenant-owned tables without going through
  `scopedWhere(req, ...)` from `src/middleware/tenant.js`.
- Job status changes must go through the state machine in
  `src/modules/jobs/job.transitions.js` and run inside a transaction.
- Auth: JWT access (15m) + refresh (7d); roles OWNER / DISPATCHER / TECHNICIAN
  via `requireRole`.
- Env is validated in `src/config/env.js`; add new vars to `.env.example` too.

## Layout

- `apps/api` — Express API (`src/modules/<domain>/` per domain)
- `apps/web` — React 19 + Vite + Tailwind 4 (`src/features/<domain>/`)
- `docker-compose.yml` — Postgres only
