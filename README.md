# ServiceHub

Job dispatch & tracking system for small home-service businesses: take job
requests, assign technicians, track jobs through a lifecycle, capture
completion photos, and invoice.

## Stack

- **API:** Node.js + Express (plain JS, ES modules) + Prisma + PostgreSQL
- **Web:** React 19 + Vite + Tailwind CSS 4 (plain JS)
- **Infra:** Postgres runs in Docker (no local install needed)

## Getting started

```bash
# 1. Install dependencies (root, workspaces cover api + web)
npm install

# 2. Configure env
cp .env.example .env

# 3. Start Postgres in Docker
docker compose up -d

# 4. Create schema + seed demo data
npm run db:migrate
npm run db:seed

# 5. Run dev servers (two terminals, or use the root scripts)
npm run dev:api    # http://localhost:4000
npm run dev:web    # http://localhost:5173
```

Demo logins (after seeding, password `password123`):
`owner@demo.test` / `dispatcher@demo.test` / `tech@demo.test`

## Architecture notes

- **Multi-tenancy:** every table carries `tenantId`; all queries go through
  `src/middleware/tenant.js` (`scopedWhere`) so isolation is enforced in one
  place. A test proving tenant isolation is planned.
- **Job lifecycle:** modeled as an explicit state machine in
  `src/modules/jobs/job.transitions.js`. Status changes validate against it
  inside a transaction, so concurrent updates can't corrupt the lifecycle.
- **Auth:** JWT access token (15m) + refresh token (7d). Roles: OWNER,
  DISPATCHER, TECHNICIAN enforced via `requireRole` middleware.

## Roadmap

- [ ] Photos on job completion (upload + storage)
- [ ] Invoice generation (PDF) + Stripe payment links
- [ ] Email notifications / reminders
- [ ] Dashboard stats (revenue, overdue, top customers)
- [ ] Tests (unit + tenant-isolation + E2E), CI via GitHub Actions
- [ ] Drag-and-drop rescheduling on the dispatch board
