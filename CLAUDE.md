# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

**Nazoratchi Pro** — attendance & sales-control system for the "Amir" company.
Evolution: `v1` (n8n) → `v2` (Telegram bot) → **`v3` (web app)**.

`v3` is a **split monorepo** with two independently-deployed Node processes plus a worker:

- **`backend/`** — Express 5 REST API (`api/main.ts`, port **4000**) + a **worker** (`worker/main.ts`, cron jobs + Telegram `/start` listener). All business logic lives in `backend/src/`.
- **`frontend/`** — Next.js 15 (App Router) + React 19 UI (port **3000**). No backend logic; it talks to the Express API.

> ⚠️ The frontend does **not** contain API route handlers or Mongoose code. Anything server/data-related is in `backend/`. (Earlier versions had everything inside one Next.js app — that is no longer true.)

## Commands

All commands below are run from the **repo root** unless noted.

```bash
# Install everything (root + backend + frontend)
npm install && npm install --prefix backend && npm install --prefix frontend
# (or) npm run install:all   # installs backend + frontend only

# Dev — runs backend (:4000) + worker + frontend (:3000) together via concurrently
npm run dev
npm run dev:web        # backend + frontend only (no worker)
npm run dev:backend    # Express API only (tsx watch)
npm run dev:worker     # worker only (cron + Telegram)
npm run dev:frontend   # Next.js only

# Database (local Docker mongo + mongo-express on :8081)
npm run db:up
npm run db:down

# Seed
npm run seed           # minimal: CEO (from .env) + default stores/penalty rules
npm run seed:demo      # FULL realistic demo data — see "Seeding" below

# Quality
npm run typecheck      # tsc --noEmit for BOTH backend and frontend
npm run lint           # eslint (frontend)
npm run test           # vitest (backend)
```

Backend-only scripts (run with `--prefix backend`, or `cd backend` first):

```bash
npm run build --prefix backend     # (no build step — backend runs via tsx)
npm run worker --prefix backend    # worker, one-shot (no watch)
npm run backup --prefix backend    # mongodump → backend/backups/<timestamp>/
npm run job --prefix backend <name>   # manually trigger one cron job
```

`npm run job <name>` accepts: `billz-sync`, `morning-reminder`, `daily-report`,
`weekly-report`, `monthly-report`, `mark-absentees`, `daily-rewards`.

Run a single test file: `cd backend && npx vitest run path/to/file.test.ts`.

Production deploy uses `docker-compose.prod.yml` (brings up `web`, `worker`, `mongo`):
`docker compose -f docker-compose.prod.yml up -d --build`.

## Architecture

### Three runtime pieces

1. **Frontend** (`frontend/`, `npm run dev:frontend`) — Next.js serves the UI. Server Components fetch data from the Express API; Client Components use RTK Query (`fetch` under the hood). Port 3000.
2. **Backend API** (`backend/api/main.ts`, `npm run dev:backend`) — Express 5 REST API. Port 4000. Sets up CORS, `express.json`, `cookie-parser`, a session loader, then mounts 17 routers under `/api/*`. Health check at `GET /api/health`.
3. **Worker** (`backend/worker/main.ts`, `npm run dev:worker`) — separate process: `node-cron` jobs (reports, Billz sync, reminders) **and** the incoming Telegram bot listener (`/start <token>` account-linking). Shares `backend/src/` logic with the API. The Telegram listener runs **only here** (single long-poll consumer).

In production all three run from the same Docker image as separate containers.

### Frontend ↔ Backend connection

`frontend/next.config.ts` rewrites `/api/:path*` → `${BACKEND_URL}/api/:path*`
(`BACKEND_URL` defaults to `http://localhost:4000`). This keeps everything **same-origin** for the browser, so the `httpOnly` session cookie works transparently for both Server Components and Client Components. No `NEXT_PUBLIC_API_URL` is used — always call `/api/...`.

### Repo layout

```
/
├── package.json                    # root — concurrently scripts, db:up/down
├── backend/
│   ├── api/
│   │   ├── main.ts                 # Express app + router mounting (port 4000)
│   │   ├── middleware/
│   │   │   ├── auth.ts             # loadSession, requireAuth, requireManager, requireCeo
│   │   │   └── params.ts
│   │   └── routes/                 # 17 routers (auth, attendance, sales, ceo, admin, ...)
│   ├── worker/main.ts              # cron + Telegram listener entry point
│   └── src/                        # server-only business logic
│       ├── core/
│       │   ├── config/             # env.ts (Zod), constants.ts, load-env.ts
│       │   ├── database/connection.ts
│       │   ├── logger/             # pino
│       │   └── utils/              # date.ts, geo.ts, geocode.ts, secret-crypto.ts, format.ts
│       ├── modules/<name>/         # *.model.ts + *.service.ts (+ *.dto.ts when needed)
│       ├── jobs/                   # cron jobs + index.ts (startJobs)
│       ├── notifications/          # telegram.ts (outgoing), telegram-bot.ts (incoming)
│       └── scripts/                # seed, seed-demo-data, backup, run-job, migrate-env-integrations
└── frontend/
    ├── middleware.ts               # cookie presence check → redirect to /login
    ├── next.config.ts              # /api/* rewrite to backend
    ├── app/
    │   ├── (auth)/{login,register}/
    │   ├── (dashboard)/            # employee/manager pages + admin/ subtree
    │   │   ├── dashboard, attendance, sales, approvals, tasks, suggestions,
    │   │   │   rewards, reyting, rules, profile
    │   │   └── admin/{pending,employees,schedule,rules,reports,audit-logs}
    │   └── (ceo)/ceo/              # CEO-only: ai-analysis, finance, settings, stores, suggestions, team
    ├── components/                 # shared components + ui/ (shadcn), admin/, ceo/, brand/
    ├── features/<name>/components/ # feature-scoped components (tasks, rewards, schedules, ...)
    ├── services/                   # RTK Query — baseApi.ts + <domain>Api.ts
    ├── store/                      # Redux store + typed hooks
    ├── lib/                        # session.ts, api.ts (server fetch), api-client.ts, format.ts, utils.ts
    └── shared/types.ts            # shared enums + label maps (Role, Division, ShiftType, ...)
```

### Auth model

- **Phone + 4-6 digit PIN** (bcrypt). Phone is the canonical identity.
- Session: random token stored in the `Session` collection, set as an `httpOnly` cookie (name from `SESSION_COOKIE_NAME`, default `nz_session`).
- Lockout: 5 failed attempts → 15 min lock. New users register with `isApproved: false` and cannot log in until a manager/CEO approves them (`/admin/pending`).
- **Roles: `employee` | `manager` | `ceo`.**
  - `employee` — own attendance, sales, approvals, suggestions.
  - `manager` — employee actions + approvals, rewards, tasks, schedules, reports (store-scoped). Not tied to a store by default.
  - `ceo` — everything + CEO panel (integrations, system settings, all users, penalty rules, audit logs).
- **API guards** (`backend/api/middleware/auth.ts`): `loadSession` (always, attaches `req.auth`), then `requireAuth`, `requireManager` (manager|ceo), or `requireCeo`.
- **Frontend guards** (`frontend/lib/session.ts`): `requireSession`, `requireManagerSession`, `requireCeoSession` — used in Server Components; `frontend/middleware.ts` only checks cookie presence.

### How to add a feature

1. **Model**: `backend/src/modules/<name>/<name>.model.ts`. **Must use the `mongoose.models.X ?? model('X', schema)` pattern** (avoids re-registration on `tsx watch` reloads). Export `InferSchemaType` + `HydratedDocument` aliases.
2. **Service**: `backend/src/modules/<name>/<name>.service.ts` — `class XService { ... }` + singleton `export const xService = new XService()`. State-changing actions should call `auditLogsService.log({...})`.
3. **DTO** (when there's input validation): `<name>.dto.ts` with Zod schemas. (Some routes define the Zod schema inline in the route file instead — both patterns exist.)
4. **Route**: `backend/api/routes/<name>.ts` exporting `<name>Router` (Express `Router`). `router.use(loadSession)`, guard each handler, `await connectDatabase()` before any Mongoose call. **Register it in `backend/api/main.ts`.**
5. **Frontend service**: `frontend/services/<name>Api.ts` — inject endpoints into `baseApi` (RTK Query), add tag types for cache invalidation.
6. **Frontend UI**: a page under `frontend/app/(...)/<name>/page.tsx` (Server Component fetches via `apiFetch` from `lib/api.ts`); interactive pieces are Client Components in `components/` or `features/<name>/components/`.

### Module conventions

Modules under `backend/src/modules/`:
`ai`, `approvals`, `app-settings`, `attendances`, `audit-logs`, `auth`, `billz`,
`company-rules`, `notifications`, `penalties`, `reports`, `rewards`, `sales`,
`schedules`, `stores`, `suggestions`, `tasks`, `telegram`, `users`.

Each typically exposes `*.model.ts` (schema + types) and `*.service.ts` (singleton). Read the model file first to understand the data shape. `audit-logs` and `notifications` (in-app bell) are cross-cutting.

### Backend import / runtime quirks

- Backend runs via **`tsx`** (no compile step) — `npm run dev:backend` is `tsx watch api/main.ts`.
- `src/`/`api/` relative imports use the **`.js` extension** (e.g. `import { x } from './x.service.js'`) even though the files are `.ts` — required for ESM under `tsx`.
- `"type": "module"` — everything is ESM.
- Always `await connectDatabase()` before Mongoose calls in a route handler (idempotent; connection cached in `globalThis`).
- Entry points (`api/main.ts`, `worker/main.ts`, every script) **import `'../src/core/config/load-env.js'` first** — it loads the single root `.env` (4 dirs up from `core/config/`).

### Timezone

All business logic is **Asia/Tashkent**. Never `new Date()` for "today" — use helpers in `backend/src/core/utils/date.ts` (`startOfTashkentDay`, `tashkentTimeToday`, `minutesBetween`, `addDays`, `formatDate`, …). Cron jobs pass `{ timezone: TIMEZONE }`. `TZ` env defaults to `Asia/Tashkent`.

### Telegram (outgoing + linking only)

- `backend/src/notifications/telegram.ts` — outgoing senders: `notifyUser(telegramId, text)`, `notifyManagers(text)`, `notifyCEOs(text)`. Bot token is read from the DB (`AppSettings`), not env. If unconfigured, all senders are silent no-ops.
- `backend/src/notifications/telegram-bot.ts` — incoming long-poll listener, **worker only**. Handles `/start <token>` to bind a `telegramId` to a user (one-time link token, 15 min TTL, created via `POST /api/telegram/link`).
- `grammy` is used only for its `Api`/`Bot` classes. No conversations/inline keyboards.

### Settings encryption (integration secrets)

Integration secrets — **Gemini API key, Telegram bot token, Billz token** — are **not** in `.env`. The CEO sets them in the CEO panel (`PUT /api/ceo/integrations`); they're stored AES-encrypted in the singleton `AppSettings` document, encrypted/decrypted via `backend/src/core/utils/secret-crypto.ts` using `SETTINGS_ENCRYPTION_KEY` (min 16 chars, required). `getMasked()` returns booleans, never the raw secrets. Changing `SETTINGS_ENCRYPTION_KEY` makes existing encrypted values unreadable.

### Cron jobs (worker)

Registered in `backend/src/jobs/index.ts` (`startJobs`), timezone Asia/Tashkent:

| Job | Schedule | Purpose |
|-----|----------|---------|
| `billz-sync` | every 15 min (`*/15 * * * *`) | Pull today's sales from Billz → `BillzSale` cache |
| `morning-reminder` | daily 09:05 | Telegram reminder to employees who haven't checked in |
| `daily-report` | daily 21:00 | Attendance + sales + leaderboard + optional AI analysis → managers/CEO |
| `mark-absentees` | daily 23:30 | Mark no-shows `absent` + apply penalties (skips `day_off`) |
| `daily-rewards` | daily 23:40 | Auto rewards: top store + top employee per division (idempotent/day) |
| `weekly-report` | Sun 21:00 | 7-day sales report → managers/CEO |
| `monthly-report` | 1st 09:00 | 30-day sales report → managers/CEO |

To add a job: define `backend/src/jobs/<name>.job.ts`, wire it into `startJobs()` in `jobs/index.ts`, and add it to the `JOBS` map in `backend/src/scripts/run-job.ts` for manual triggering.

### Sales & rating (leaderboard)

**Core rule (since 2026-06-09):** employee-entered (manual `Sale`) data is measured by **product quantity (dona) only — never money**. **Any money figure shown to CEO/managers comes from Billz (`BillzSale`) only.** Employees enter quantity + note; there is **no Summa (amount) input**.

- Manual employee sales live in the `Sale` model (`source: 'manual'`); Billz POS data is a **separate** `BillzSale` model. Don't conflate them.
- The `Sale.amount` field still exists (schema default `0`) for backward compatibility, but **nothing sums it** — it's vestigial. Don't reintroduce money from manual sales.
- The daily **leaderboard** (`reports.service.ts` `dailyLeaderboard`) ranks stores/employees by manual-sale **quantity** (`$sum: '$quantity'`). The old `minUnitPrice`/`amount > 0` filter is gone (`LEADERBOARD` constant removed). Auto-rewards (`daily-rewards.job.ts`) also rank by quantity — consistent.
- The CEO sales report (`buildSalesReport`): manual sales shown as **quantity**; all money totals (`grandTotalAmount`) come from **Billz only**.
- AI analysis (`insights.service.ts`): money fields (`totalSales`, `weekTotal`, `salesByDay`, `trend`, `delta`) are **Billz-only**; manual `quantity` feeds the physical item counts (`totalItems`, `weekItems`, `itemsByDay`). `sales.service.ts` `getDailyStoreTotal`/`getUserStats` return quantity, not amount.

### Config & env

`backend/src/core/config/env.ts` validates `process.env` with Zod and **throws on failure** (no `process.exit`). Add new env vars there. Business constants (shift types, divisions, default rewards, leaderboard settings, lockout policy) live in `backend/src/core/config/constants.ts` — `npm run seed` reads from these. See `.env.example` for the full variable list (`MONGO_URI`, `SESSION_SECRET`, `SETTINGS_ENCRYPTION_KEY`, `CEO_*`, `BACKEND_URL`, `COOKIE_SECURE`, …).

### Seeding

- `npm run seed` — minimal: creates the CEO (from `CEO_*` in `.env`) + default stores + penalty rules. **Wipes** existing data first — first install only.
- `npm run seed:demo` — full realistic dataset: 5 stores, ~15 employees + 1 manager + 1 CEO, 14 days of attendance/sales/Billz cache, schedules, rewards, tasks, notifications. Deterministic; safe to re-run (wipes attendance/sales/etc. and regenerates). Demo logins are printed at the end (CEO `998901234567`/`1234`, manager `998900000000`/`2222`, employees `998901000001`/`1111`, …).

## User-facing language

All user-facing strings (UI labels, error messages, Telegram notifications) are **Uzbek (Latin script)**. Keep this consistent — don't introduce English copy. Log messages are also mostly Uzbek (style choice; English logs are fine where they read better).

## Reference docs

- `README.md` — setup walkthrough (Uzbek).
- `QOLLANMA.md` — end-user guide (Uzbek): roles, Telegram linking, what each section does.
- `nazoratchi_ai_pro_docs.md` — original v1 (n8n) design doc; useful for *why* certain business rules exist (penalty bands, approval flow, Billz scope).
