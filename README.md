# LeadFlow

A single-screen lead manager for sales reps: track every lead, log each discussion, and never miss a follow-up.

![Lead list with today's and overdue follow-ups pinned at the top](docs/screenshots/01-leads.png)

| Lead timeline sheet | Add lead with duplicate detection |
| --- | --- |
| ![Lead sheet with pipeline stepper, follow-up banner, timeline and note composer](docs/screenshots/02-lead-sheet.png) | ![Add lead dialog showing a duplicate phone warning](docs/screenshots/03-add-lead.png) |
| **First use** | **Dark mode** |
| ![Empty state with onboarding hint](docs/screenshots/04-empty-state.png) | ![Dark theme with a lead open](docs/screenshots/05-dark-mode.png) |
| **Command palette** | **Mobile (390 px)** |
| ![Command palette searching leads](docs/screenshots/07-command-palette.png) | ![Mobile layout](docs/screenshots/06-mobile.png) |

Demo video: _add link here_

---

## Features

### Core (from the brief)

| Requirement | Where it lives |
| --- | --- |
| Lead list with name, status badge, last discussion note and time since it | `LeadRow`, backed by a `LATERAL` join for the last note |
| Filter by New / Contacted / Qualified / Proposal Sent / Won / Lost | Status chips with live counts, synced to `?status=` |
| Today's follow-ups pinned at the top | **Follow-ups** section (overdue first, then today), never repeated in **All leads** |
| Clicking a lead opens a dialog, not a page | Right-side sheet (a focus-trapped modal dialog), synced to `?lead=` |
| Full discussion history, newest first | Timeline grouped by day with sticky day labels |
| Add a note with an optional follow-up date and time | Composer with presets (Later today, Tomorrow 10 AM, In 2 business days, Next Monday, Custom) |
| Saving a follow-up updates the lead and the list immediately | Optimistic update of every cached view, then server reconciliation |
| Update status from the dialog | Pipeline stepper (desktop) or status select (mobile), with a 6-second Undo |
| Add lead: name required, company and phone optional, status New | Add lead dialog with inline validation |

### Bonus (all implemented)

Search by name **and** company, overdue follow-ups highlighted in red, Docker Compose, a time-relative seed script with 10 leads, and status filters with counts.

### Extras

- **Idle tags.** Open leads with no activity past a per-stage threshold show "Idle 6d" (New 2 days, Contacted 4, Qualified 7, Proposal Sent 5).
- **Mark done.** Completing a follow-up is explicit and leaves a timeline event, so stale reminders never pile up as false overdue items.
- **Undo instead of confirm dialogs.** Status changes are optimistic; Undo removes the timeline event rather than adding a second one.
- **Command palette** (`⌘/Ctrl K`) for lead search and actions, plus single-key shortcuts with a `?` cheat sheet.
- **Duplicate detection.** Phone numbers are normalised and unique; a duplicate returns 409 with a link to the existing lead.
- **Time-zone-aware follow-ups.** "Today" means today where the rep is, not where the server is.
- **URL state.** Filters, search and the open lead survive refresh, and Back closes the sheet.
- **Dark mode, mobile layout down to 360 px, keyboard-only operation and reduced motion.**
- **Drafts.** An unsent note is kept per lead in local storage and restored when the lead is reopened.

## Quick start (Docker)

```bash
cp .env.example .env && docker compose up --build
```

| Service | URL |
| --- | --- |
| App | http://localhost:3000 |
| API docs (Swagger) | http://localhost:8000/docs |
| Health check | http://localhost:8000/api/v1/health |

The backend container runs migrations and, with `SEED_ON_START=true`, loads the demo data on first start (it skips seeding if leads already exist). `make up`, `make down` and `make logs` wrap the same commands.

## Local development

**Prerequisites:** Node.js 24 LTS (22.12+ works), Python 3.13, [uv](https://docs.astral.sh/uv/), and Docker for Postgres.

```bash
make dev-db
```

This starts only Postgres 17 (creating `.env` from the example if needed). The init script also creates the `leadflow_test` database used by the backend tests.

**Backend**

```bash
cd backend
uv sync
cp .env.example .env
uv run alembic upgrade head
uv run python -m app.scripts.seed
uv run uvicorn app.main:create_app --factory --reload --port 8000
```

**Frontend**

```bash
cd frontend
npm ci
cp .env.example .env.local
npm run dev
```

**Everything at once**

```bash
make check
```

`make check` runs ruff, mypy and pytest for the backend and ESLint, Prettier, `tsc` and Vitest for the frontend. Other targets: `make backend-dev`, `make frontend-dev`, `make migrate`, `make seed`, `make seed-reset`, `make gen-api`.

## Environment variables

Every variable is validated at startup (pydantic-settings on the backend, zod on the frontend). A missing or invalid value stops the process with a message naming the variable.

**Root `.env`** (read by Docker Compose)

| Variable | Default | Used for |
| --- | --- | --- |
| `POSTGRES_USER` | `leadflow` | Database user for the `db` service and the backend's `DATABASE_URL` |
| `POSTGRES_PASSWORD` | `leadflow` | Database password |
| `POSTGRES_DB` | `leadflow` | Database name |
| `POSTGRES_PORT` | `5432` | Host port for Postgres |
| `BACKEND_PORT` | `8000` | Host port for the API |
| `FRONTEND_PORT` | `3000` | Host port for the web app; also sets the backend's `CORS_ORIGINS` |
| `APP_ENV` | `production` | Backend environment name |
| `LOG_LEVEL` | `INFO` | Backend log level |
| `DEFAULT_TIMEZONE` | `Asia/Kolkata` | Fallback time zone when a request has no `X-Timezone`; also anchors the seed data |
| `SEED_ON_START` | `true` | Load demo data on container start when the database is empty |

**`backend/.env`**

| Variable | Default | Used for |
| --- | --- | --- |
| `APP_ENV` | `development` | `development`, `test` or `production` |
| `APP_NAME` | `LeadFlow API` | OpenAPI title |
| `APP_VERSION` | `1.0.0` | OpenAPI version and startup log |
| `API_V1_PREFIX` | `/api/v1` | Router prefix |
| `DATABASE_URL` | `postgresql+asyncpg://leadflow:leadflow@localhost:5432/leadflow` | Application database (must use the asyncpg driver) |
| `TEST_DATABASE_URL` | `postgresql+asyncpg://leadflow:leadflow@localhost:5432/leadflow_test` | Database the test suite migrates and rolls back |
| `DB_POOL_SIZE` | `5` | SQLAlchemy pool size |
| `DB_MAX_OVERFLOW` | `5` | Extra connections beyond the pool |
| `DB_ECHO` | `false` | Log SQL statements |
| `CORS_ORIGINS` | `http://localhost:3000` | Comma-separated origins for direct browser access to the API |
| `DEFAULT_TIMEZONE` | `Asia/Kolkata` | IANA zone used when `X-Timezone` is absent |
| `LOG_LEVEL` | `INFO` | `DEBUG`, `INFO`, `WARNING` or `ERROR` |
| `LOG_FORMAT` | `console` | `console` (coloured, local) or `json` (Docker) |

**`frontend/.env.local`**

| Variable | Default | Used for |
| --- | --- | --- |
| `API_INTERNAL_URL` | `http://localhost:8000` | Where the server-side proxy forwards `/api/*`. Read at request time, never sent to the browser. |

## Architecture

```mermaid
flowchart LR
    Browser["Browser<br/>React 19 + TanStack Query"] -->|"same-origin /api/v1/*<br/>X-Timezone, X-Request-ID"| Proxy["Next.js route handler<br/>app/api/[...path]"]
    Proxy -->|"API_INTERNAL_URL"| Routers["FastAPI routers<br/>HTTP only"]
    Routers --> Services["Services<br/>business rules, transactions"]
    Services --> Repositories["Repositories<br/>SQL only"]
    Repositories --> Postgres[("PostgreSQL 17<br/>pg_trgm")]
```

### Backend layers

| Layer | Folder | Rules |
| --- | --- | --- |
| Routers | `app/api/v1` | Parse HTTP input into Pydantic schemas, call one service method, map the result to a response schema. Never touch the session or SQL. |
| Services | `app/services` | Own the transaction (`async with session.begin()` per use case), apply business rules, take time from an injectable `Clock`. Never import FastAPI. |
| Repositories | `app/repositories` | Build and run SQL. Raise nothing HTTP-related. |
| Domain | `app/domain` | Enums, follow-up and staleness policies, phone and text rules, cursors, domain errors. Pure functions, unit tested. |
| Core | `app/core` | Settings, logging, request-ID middleware, RFC 9457 error handlers, database engine. |

Every error leaves the API as `application/problem+json` from one set of handlers. Domain errors (`LeadNotFoundError`, `DuplicatePhoneError`, `NoPendingFollowUpError`, …) carry their status, type, field errors and extensions; services translate a unique-index violation into `DuplicatePhoneError` so even a race between two requests produces the friendly 409.

### Frontend layers

| Layer | Folder | Contents |
| --- | --- | --- |
| App | `src/app` | Root layout, providers, the page (a static shell with a Suspense boundary), error and not-found pages, the API proxy |
| Features | `src/features` | `leads` (list, filters, follow-ups, add lead, shared mutations, cache helpers), `lead-detail` (sheet, stepper, timeline, composer), `command-palette` |
| Components | `src/components` | `ui` primitives (shadcn/ui on Radix) and `common` building blocks such as `StatusBadge`, `FollowUpPill`, `EmptyState` |
| Lib | `src/lib` | Typed API client, problem parser, query client and keys, date helpers, safe storage |
| Config | `src/config` | Statuses, copy, limits, shortcuts and follow-up presets |

Components never call `fetch`; they use feature hooks, which use the single typed client.

### Single sources of truth

| Concept | Backend | Frontend |
| --- | --- | --- |
| Lead statuses | `app/domain/enums.py` | `src/config/statuses.ts` (labels, descriptions, pipeline order, static class strings) |
| Validation limits | `app/core/limits.py` | `src/config/limits.ts` |
| Error shape | `app/core/error_handlers.py` | `src/lib/api/problem.ts` |
| API types | Pydantic schemas → OpenAPI | `src/lib/api/schema.ts`, generated by `npm run gen:api` |
| Design tokens | — | `src/app/globals.css` (the only file with raw colours) |
| Query keys | — | `src/lib/query-keys.ts` |
| Dates and times | `app/domain/follow_up_policy.py` | `src/lib/dates.ts` |
| Shortcuts | — | `src/config/shortcuts.ts` |
| User-facing copy | — | `src/config/copy.ts` |

## API

Base path `/api/v1`. Interactive docs at http://localhost:8000/docs; the frontend's types are generated from the same OpenAPI document.

| Method & path | Success | Errors | Notes |
| --- | --- | --- | --- |
| `GET /health` | 200 `{"status":"ok","database":"ok"}` | 503 | Runs `SELECT 1` with a 2 s timeout |
| `GET /leads?status&q&limit&cursor` | 200 `LeadPage` | 400 bad cursor or time zone, 422 | `limit` 1–100 (default 30); keyset on `(last_activity_at, id)`; `q` matches name or company with `%` and `_` escaped |
| `GET /leads/follow-ups?status&q` | 200 `{"overdue":[…],"today":[…]}` | 400, 422 | Open leads only, ordered by due time |
| `GET /leads/stats?q` | 200 `{"total","by_status","overdue","due_today"}` | 400, 422 | Counts ignore the status filter and respect search |
| `POST /leads` | 201 `LeadRead` + `Location` | 409 duplicate phone, 422 | Writes a `lead_created` event |
| `GET /leads/{lead_id}` | 200 `LeadRead` | 404, 422 | |
| `PATCH /leads/{lead_id}` | 200 `LeadRead` | 404, 409, 422 (empty body: "Provide at least one field") | `name`, `company`, `phone`, `status` |
| `POST /leads/{lead_id}/follow-up/complete` | 200 `LeadRead` | 404, 409 no pending follow-up | Writes `follow_up_completed` |
| `GET /leads/{lead_id}/activities?limit&cursor` | 200 `ActivityPage` | 400, 404, 422 | Newest first, 50 per page |
| `POST /leads/{lead_id}/activities` | 201 `{"activity","lead"}` + `Location` | 404, 422 | Notes, optionally with `follow_up_at` |
| `GET /leads/{lead_id}/activities/{activity_id}` | 200 `ActivityRead` | 404, 422 | Target of the note's `Location` header |

`LeadRead` includes computed fields so the UI never re-derives business rules: `follow_up_state` (`none`, `overdue`, `today`, `upcoming`, evaluated in the caller's time zone), `is_stale`, `idle_days` and `last_note` (`preview` up to 160 characters, `occurred_at`).

Every request may send `X-Timezone` (IANA name; invalid → 400) and `X-Request-ID` (echoed back, generated if absent). An error looks like this:

```json
{
  "type": "https://leadflow.dev/problems/duplicate-phone",
  "title": "Duplicate phone number",
  "status": 409,
  "detail": "A lead with this phone number already exists.",
  "instance": "/api/v1/leads",
  "request_id": "6f1c2a3b4d5e4f608a7192b3c4d5e6f7",
  "errors": [{ "field": "phone", "message": "Already used by Ananya Iyer" }],
  "existing_lead_id": "0a19df60-1e52-44c7-a95d-631d50907160",
  "existing_lead_name": "Ananya Iyer"
}
```

Validation errors use the same shape with `type` `…/validation-error`, status 422 and one entry per field, with messages written for people ("This field can't be empty.", "Include a UTC offset, e.g. 2026-05-05T10:00:00+05:30."). Unexpected errors return a generic 500 and are logged with their stack trace and request ID; internals never leak.

### Business rules

1. Creating a lead writes a `lead_created` event in the same transaction.
2. Phones normalise to digits with an optional leading `+` (7–15 digits) and are unique; names may repeat.
3. A note updates `last_activity_at`, and a note with `follow_up_at` replaces the lead's follow-up, all in one transaction.
4. `follow_up_at` needs a UTC offset, may be at most 60 seconds in the past and at most 365 days ahead.
5. A status change writes `status_changed` with `from` and `to`; setting the current status is a no-op that writes nothing.
6. Moving to Won or Lost clears the follow-up and records it in `meta.cleared_follow_up_at`.
7. Undo coalescing: reverting the latest status change within 30 seconds deletes that event, restores the cleared follow-up and recomputes `last_activity_at` from the remaining events.
8. Completing a follow-up requires one (409 otherwise), clears it and writes `follow_up_completed` with `meta.due_at`.
9. Every write updates `updated_at`.

## Decisions & trade-offs

- **FastAPI, not "FastAI".** The brief's "NextJs + FastAI" reads as a typo for FastAPI, the Python web framework.
- **Same-origin proxy instead of `NEXT_PUBLIC_API_URL`.** `NEXT_PUBLIC_*` values are baked into the client bundle at build time, so one Docker image couldn't be pointed at a different API, and `localhost` means different things in the browser and inside the Compose network. The browser only calls `/api/v1/*` on its own origin; a route handler forwards to `API_INTERNAL_URL`, read at request time. It forwards only the headers that matter, preserves status, `Location` and `X-Request-ID`, and turns an unreachable backend into a 502 problem response. No CORS is needed for the app; the backend still configures `CORS_ORIGINS` for direct API use.
- **A side sheet is still a dialog.** The lead opens in a right-side sheet built on Radix Dialog (modal, focus-trapped, `Esc` closes, focus returns to the row), so the list stays visible for context, as in Linear's peek. Below 640 px it fills the screen. Opening pushes `?lead=` so Back closes it; closing replaces that entry so Back doesn't reopen it.
- **Follow-up buckets are calendar days in the rep's time zone.** The frontend sends `X-Timezone` on every request and the backend computes `overdue`/`today`/`upcoming` against the start and end of *that* day, so a 10 AM follow-up in Kolkata isn't overdue just because UTC has rolled over. A follow-up earlier today is still "today"; the UI adds "· 3h late" in red.
- **`VARCHAR` + `CHECK` instead of native Postgres enums.** Adding or renaming a status is a one-line constraint change instead of an `ALTER TYPE` dance. SQLAlchemy maps the column to a Python `StrEnum`.
- **Last note via `LEFT JOIN LATERAL` backed by a partial index.** The list query fetches each lead's latest note with a lateral subquery on `activities (lead_id, occurred_at DESC) WHERE kind = 'note'`, never an N+1. The `kind = 'note'` predicate is a SQL literal, not a bind parameter, so the planner can prove the partial index applies even with prepared statements. Checked with `EXPLAIN ANALYZE` on 20,000 leads and 240,000 activities: an index scan on `ix_leads_last_activity_at_id` drives one lookup on `ix_activities_lead_id_note_occurred_at` per row (31 for a 30-row page plus the look-ahead row), and the query runs in under half a millisecond.
- **Keyset pagination with opaque cursors.** Pages are ordered by `(last_activity_at, id)` and the cursor is base64url JSON of the last row's pair, so new activity never shifts or duplicates rows the way `OFFSET` would. Malformed cursors are a 400.
- **Search.** `q` is trimmed and matched against `lower(name)` and `lower(company)` with `LIKE`, with `\`, `%` and `_` escaped, so `q=%` finds a literal percent sign instead of every lead. GIN trigram indexes on the same expressions keep it fast.
- **Undo coalescing.** Undo calls the normal `PATCH` with the previous status. If that reverts the latest event within 30 seconds, the backend deletes the event instead of writing a second one, restores any follow-up the first change cleared, and recomputes `last_activity_at`, so the timeline and the list order look as if nothing happened.
- **Won and Lost clear follow-ups, and closed leads don't take new ones.** A closed deal with a pending reminder would either clutter the pinned section or silently never show up there. Notes still work on closed leads, but a `follow_up_at` on one is a 422 and the composer hides the toggle with a hint to reopen the lead.
- **Pinned leads are hidden from "All leads" in the client.** The contract keeps `GET /leads` simple; the list filters out rows that the follow-ups query pins, and the header count is "matching leads minus pinned leads". The pinned set and the list use the same filters and the same `isPinned` rule, so optimistic updates move a lead between sections instantly.
- **Client-side data fetching.** This is an interactive, single-user tool built around optimistic updates and undo, so TanStack Query on the client owns the server state. The page is still a prerendered static shell (Next.js 16 Cache Components) with skeletons that match the final layout, and the interactive part streams in behind a Suspense boundary.
- **Optimistic where it's safe, pessimistic where the server decides.** Notes, status changes and Mark done update every cached view at once (`features/leads/cache.ts`) and roll back on failure. Creating a lead waits for the server, because the server assigns the id and duplicates are common.
- **An extra read endpoint.** `POST /leads/{id}/activities` returns `Location`, so `GET /leads/{id}/activities/{activity_id}` exists for that header to point at something real.
- **Injectable clock.** Services take "now" from a `Clock` dependency. Tests freeze it, and the seed script uses a fixed clock per step to backdate realistic histories through the real service layer.
- **Seed data is relative to "now".** Every timestamp is computed from the current time in `DEFAULT_TIMEZONE`, so the demo always has 2 overdue, 2 due-today (one already late), 2 upcoming and 2 idle leads. A test seeds at 00:02, 09:30 and 23:52 to prove that holds at any time of day.
- **No login.** The brief makes it optional and the time went into the core flows. Adding it would mean a `users` table with argon2-hashed passwords, a backend-issued HTTP-only secure session cookie that the proxy forwards, an `owner_id` on leads with every repository query scoped to the current user, a seeded demo user, and 401 problem responses.
- **Toolchain versions.** Everything is on the latest stable release except where a peer range forces otherwise: TypeScript stays on 5.9 because `openapi-typescript` and `typescript-eslint` don't support 7 yet, and ESLint stays on 9 because Next's ESLint plugins don't support 10.
- **Fonts and UI primitives work offline.** Geist comes from the `geist` package through `next/font/local`, so builds (including Docker builds) never fetch Google Fonts. The shadcn/ui primitives follow the new-york v4 source and are checked in; `components.json` is set up so `npx shadcn add` works for future components.
- **Toasts never cover the composer.** They sit bottom-left on desktop (the sheet is on the right) and top-center on mobile. They stay clickable while a modal is open, and clicking one doesn't count as clicking outside the sheet, so Undo works without closing the lead you're looking at.
- **Focus always has somewhere sensible to go.** The sheet, dialogs and palette open from URL state and shortcuts rather than Radix triggers, so the overlay primitives remember what had focus when they opened and return it on close, and the lead sheet returns focus to that lead's row. `J`/`K` move real focus along with the highlight, so `Enter` and screen readers act on the row you can see.
- **The palette highlights the top result.** Lead results arrive after a 250 ms debounce, so the palette re-selects the first item whenever the result set changes; `Enter` opens the best match instead of whichever action happened to be first a moment earlier.
- **Zero comments.** Explanations live in this README; code is meant to read on its own through names, small functions and types. Alembic's template is stripped, and the generated API types are printed without comments.

## Testing

| Suite | Command | What it covers |
| --- | --- | --- |
| Backend unit | `uv run pytest tests/unit` | Follow-up buckets across time zones (Kolkata vs New York at UTC midnight, DST days), staleness thresholds, phone normalisation, note previews, `LIKE` escaping, cursor encoding and rejection |
| Backend API | `uv run pytest tests/api` | Every row of the contract table against a real Postgres database: status codes, `Location` headers, problem+json shape and field messages, duplicate phone 409 with extensions, naive and out-of-range follow-ups, invalid `X-Timezone`, status no-op, Won clearing follow-ups, undo coalescing, ordering and pagination, search escaping, 404/405/500/503 handling, and seed coverage at three times of day |
| Frontend | `npm test` | Date helpers (relative time, day labels, late detection, presets including the business-day skip and midnight rule), problem parsing, cache helpers that move leads between sections, avatars, `StatusBadge` and `FollowUpPill` |

The backend suite (143 tests) runs Alembic migrations once against `TEST_DATABASE_URL`, wraps each test in a transaction that rolls back, and freezes time through the `Clock` override. The frontend suite has 73 tests. CI (`.github/workflows/ci.yml`) runs ruff, mypy `--strict`, pytest, ESLint, Prettier, `tsc` and Vitest, and finishes with a production `next build`.

The production build was also driven in a headless browser (Playwright) through the main flows: logging a note with a follow-up for today and watching the lead move into the pinned section, a status change surviving a reload, Undo leaving no stray event, duplicate phone handling on create and edit, keyboard shortcuts, the command palette, drafts, timeline pagination, the 360 px layout, and the error state with the backend stopped.

## AI usage

LeadFlow was built with Claude Code, Anthropic's coding agent, working from a detailed build brief that I wrote: the product scope, the patterns borrowed from Pipedrive, HubSpot, Attio and Linear, the architecture and layering rules, the API contract, the business rules, the design tokens and the acceptance checklist. The agent wrote the code, tests and this README under that brief. My part was the specification and the decisions in it, reviewing every file, testing the flows myself, and making the calls recorded under Decisions & trade-offs.

## Project structure

```
leadflow/
├── docker-compose.yml
├── Makefile
├── .github/workflows/ci.yml
├── docker/postgres/init/          # creates leadflow_test for local tests
├── docs/screenshots/
├── backend/
│   ├── alembic/                   # comment-free template, one migration
│   ├── app/
│   │   ├── api/                   # dependencies, OpenAPI helpers, v1 routers
│   │   ├── core/                  # settings, logging, middleware, errors, clock, limits
│   │   ├── domain/                # enums, policies, text rules, cursors, errors
│   │   ├── models/                # Lead, Activity
│   │   ├── repositories/          # SQL
│   │   ├── schemas/               # request and response models
│   │   ├── services/              # use cases and view building
│   │   └── scripts/seed.py
│   └── tests/{unit,api}
└── frontend/
    ├── scripts/generate-api-types.mjs
    └── src/
        ├── app/                   # layout, page, providers, API proxy
        ├── components/{ui,common}
        ├── features/{leads,lead-detail,command-palette}
        ├── hooks/
        ├── lib/                   # api client, problem parser, dates, query setup
        └── config/                # statuses, copy, limits, shortcuts, presets
```

## Next steps

- Authentication and multi-user ownership (see the login note above), then team views and lead assignment.
- Reminders by email or push when a follow-up comes due.
- Activity types beyond notes: calls, emails and meetings, each with its own timeline styling.
- CSV import with duplicate matching on the normalised phone.
- A Kanban pipeline view built on the same status configuration and optimistic status changes.
