# Playwright Demo — Design

**Date:** 2026-09-22
**Audience:** a client whose stack is Angular + Java. They have Node, not Python.

## Goal

A small monorepo that demonstrates two things:

1. **Playwright Test for e2e testing** — a conventional, deterministic, CI-friendly suite. No AI involved.
2. **Playwright MCP with Claude Code** — Claude driving a real browser to (a) operate the app, (b) author new tests via Playwright's planner/generator agents, (c) heal a broken test, and optionally (d) debug a planted bug.

Framing for the client: the test suite is the durable artifact that gates merges; MCP is how Claude reaches the running app to write/maintain that suite and verify its own UI work.

## Non-goals

- Persistence, auth, multi-user, deployment.
- Production-grade test data isolation (see Testing → Isolation).
- Any UI/component library or state-management library.

## Stack

- **Node 26.8.1**, pinned via `.nvmrc` and `engines` in root `package.json`.
- **npm workspaces** (not pnpm — Node 25+ no longer bundles corepack, so npm is zero-install for the client).
- **API:** Fastify + TypeScript, run directly by Node's native type stripping (`node src/server.ts`) — no build step, no tsx.
  - Consequence: API code must use erasable-only TS syntax (no `enum`, no `namespace`, no parameter properties) and explicit `.ts` import extensions. Enforce with `erasableSyntaxOnly` + `allowImportingTsExtensions` in `api/tsconfig.json`.
- **Web:** Vite + React + TypeScript, plain CSS, plain `fetch` + `useState`.
- **E2E:** `@playwright/test` in its own workspace package.

## Repo Layout

```
playwright-demo/
├── .nvmrc                      # 26.8.1
├── package.json                # workspace root; scripts: dev, test:e2e, test:e2e:ui
├── api/
│   ├── package.json
│   ├── tsconfig.json           # typecheck only (noEmit)
│   └── src/
│       ├── server.ts           # build app, listen on :8000
│       ├── app.ts              # buildApp() — Fastify instance w/ routes (importable for tests)
│       ├── routes.ts           # /api/tasks CRUD, /api/reset, /api/health
│       └── store.ts            # in-memory Map + seed data + reset()
├── web/
│   ├── package.json
│   ├── vite.config.ts          # dev server :5173, proxy /api → http://localhost:8000
│   └── src/
│       ├── main.tsx
│       ├── App.tsx             # page composition, filter state
│       ├── api.ts              # typed fetch wrappers
│       ├── types.ts
│       ├── components/         # TaskForm, TaskList, TaskItem, FilterTabs, ConfirmDialog
│       └── styles.css
├── e2e/
│   ├── package.json
│   ├── playwright.config.ts
│   ├── pages/TasksPage.ts      # page object
│   ├── fixtures.ts             # extends test with tasksPage + auto reset
│   └── tests/
│       ├── create-task.spec.ts
│       ├── edit-task.spec.ts
│       ├── delete-task.spec.ts
│       ├── validation.spec.ts
│       └── api.spec.ts         # API-only via `request` fixture
├── .mcp.json                   # Playwright MCP server for Claude Code
├── .claude/agents/             # planner / generator / healer from `playwright init-agents --loop=claude`
├── .github/workflows/e2e.yml
└── README.md                   # setup + demo runbook
```

(Exact files produced by `init-agents` are whatever that command emits; they are committed as-is.)

## API

**Task shape**

```ts
type TaskStatus = "todo" | "in_progress" | "done";
type Task = {
  id: string;          // crypto.randomUUID()
  title: string;       // required, trimmed, 1–120 chars
  description: string; // optional on input, defaults to "", max 1000 chars
  status: TaskStatus;  // defaults to "todo"
  createdAt: string;   // ISO timestamp
};
```

**Routes**

| Method | Path | Behavior |
|---|---|---|
| GET | `/api/health` | `200 { ok: true }` — used by Playwright `webServer` readiness check |
| GET | `/api/tasks?status=` | `200 Task[]`, newest first; optional status filter (invalid status → 400) |
| GET | `/api/tasks/:id` | `200 Task` or `404` |
| POST | `/api/tasks` | body `{ title, description?, status? }` → `201 Task`; invalid → `400` |
| PATCH | `/api/tasks/:id` | partial `{ title?, description?, status? }` → `200 Task`; `404` / `400` |
| DELETE | `/api/tasks/:id` | `204` or `404` |
| POST | `/api/reset` | restore seed data → `204`. Not registered when `NODE_ENV=production`. |

**Errors:** all 4xx responses are `{ error: string }` with a human-readable message (e.g. `"Title is required"`). Fastify JSON-schema validation provides the checks; a custom error handler maps validation failures to that shape. Whitespace-only titles are rejected (trim before validation).

**Seed data:** 3 tasks, one in each status, with stable titles (e.g. "Write project README" / todo, "Set up CI pipeline" / in_progress, "Create repository" / done).

**Latency knob:** `API_DELAY_MS` env var (default 0) delays every `/api/tasks*` response. Used live to show Playwright auto-waiting.

## Frontend

Single page, top to bottom:

1. **Header** — "Task Tracker".
2. **New task form** — labeled `Title` and `Description` inputs, submit button **"Add task"**. On 400, the server's `error` message renders inline under the form in an element with `role="alert"`. On success the form clears and the list refreshes.
3. **Filter tabs** — All / Todo / In progress / Done, implemented as `role="tablist"` / `role="tab"` with `aria-selected`. Filtering is server-side via `?status=`.
4. **Task list** — `<ul aria-label="Tasks">`; each `<li>` shows title, description, and:
   - a labeled status `<select>` (label "Status", visually hidden OK) that PATCHes on change;
   - **Edit** button → row switches to inline inputs with **Save** / **Cancel**; Save PATCHes; server errors shown in-row with `role="alert"`;
   - **Delete** button → confirmation dialog (`role="dialog"`, `aria-modal`, labeled) with **Delete** / **Cancel**.
5. **Empty state** — "No tasks yet" (or "No tasks match this filter" when filtered).

Loading: a simple "Loading…" text on initial fetch. Network failures show a generic `role="alert"` message. Accessible names on every interactive control are a requirement, not polish — `getByRole` locators and MCP snapshots depend on them.

## Testing (Part 1)

**Config (`e2e/playwright.config.ts`)**

- `baseURL: http://localhost:5173`
- `webServer`: two entries — API (`npm run dev -w api`, url `http://localhost:8000/api/health`) and web (`npm run dev -w web`, url `http://localhost:5173`); `reuseExistingServer: !process.env.CI`.
- Projects: `chromium`, `firefox`, `webkit`.
- `workers: 1`, `fullyParallel: false`.
- `retries: process.env.CI ? 2 : 0`, `trace: "on-first-retry"`, `screenshot: "only-on-failure"`, reporter `html` (plus `github` in CI).

**Isolation:** the store is one shared in-memory instance, so tests run serially and a fixture calls `POST /api/reset` before each test. README notes that real projects isolate via per-test data or per-worker backends; this is a deliberate demo simplification.

**Fixtures (`fixtures.ts`):** `test` extended with an auto-use reset and a `tasksPage` fixture that constructs and navigates `TasksPage`.

**Page object (`TasksPage`):** locators via `getByRole`/`getByLabel` only; methods `goto()`, `addTask(title, description?)`, `taskItem(title)`, `editTask(oldTitle, newTitle)`, `deleteTask(title)`.

**Specs covered:**

- create: adding a task makes it appear in the list (and form clears).
- edit: the edited title shows immediately after Save, and still shows after a reload.
- delete: confirm removes it; cancel keeps it.
- validation: empty/whitespace title shows the server error alert; nothing is added.
- api: CRUD round-trip + 400 on missing title + 404 on unknown id, via `request` fixture only.

**Deliberately NOT covered** (reserved for the Claude agents in Part 2): status filtering and changing status via the dropdown.

## Claude + MCP (Part 2)

- **`.mcp.json`** at repo root: server `playwright` → `npx @playwright/mcp@latest`.
- **Test agents:** run `npx playwright init-agents --loop=claude` in `e2e/` during implementation; commit the output. README shows the command.
- **Demo beats (in README runbook):**
  1. *Drive:* "Open the app, add three tasks, delete the second one."
  2. *Author:* ask the planner to plan coverage for filtering + status changes; generator writes specs; run them.
  3. *Heal:* rename the "Add task" button to "Create task", run the suite, watch failures, let the healer fix them.
  4. *Debug (optional):* `git switch demo/bug`, describe the symptom, have Claude reproduce and fix.
- **`demo/bug` branch:** branched from finished `main` with one planted bug: the inline edit "Save" sends the PATCH but the UI renders the stale title until reload (row state not updated from the response). Symptom is user-visible, reproducible in the browser, and caught by the existing edit spec's pre-reload assertion.

## CI

`.github/workflows/e2e.yml` on push/PR: checkout → `actions/setup-node` with `node-version-file: .nvmrc` and npm cache → `npm ci` → `npx playwright install --with-deps` → `npm run test:e2e` → upload `e2e/playwright-report` artifact (always).

## Root scripts

- `dev` — runs api + web concurrently (`concurrently`).
- `test:e2e` — `npm test -w e2e` (→ `playwright test`).
- `test:e2e:ui` — Playwright UI mode.
- `typecheck` — tsc across workspaces.

## README

Prereqs (Node 26.8.1 via nvm), install, run, test commands, then the demo runbook: Part 1 walkthrough (run suite, UI mode, trace viewer, `API_DELAY_MS` auto-wait demo) and Part 2 beats above, plus a short "Test suite vs. MCP — what's each for" section.
