# Playwright Demo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Node monorepo (Fastify API + Vite/React task tracker + Playwright e2e suite + Claude/MCP setup) for a client demo.

**Architecture:** npm workspaces `api/`, `web/`, `e2e/`. API is Fastify run by Node 26 native type stripping with an in-memory store. Web proxies `/api` to the API so the browser and tests see one origin (`http://127.0.0.1:5173`). Playwright's `webServer` boots both.

**Tech Stack:** Node 26.8.1, npm workspaces, Fastify 5, Vite 8, React 19, TypeScript 7 (typecheck only), @playwright/test 1.63, @playwright/mcp, node:test.

**Spec:** `docs/superpowers/specs/2026-09-22-playwright-demo-design.md`

## Global Constraints

- Node 26.8.1 (`.nvmrc`), `engines.node: ">=26.8.1"`.
- npm workspaces only; no pnpm/yarn.
- API TS must be erasable-only (`erasableSyntaxOnly`), use `import type` for types (`verbatimModuleSyntax`), and `.ts` import extensions.
- API binds `127.0.0.1:8000`; web binds `127.0.0.1:5173` (`strictPort`), proxy `/api` → `http://127.0.0.1:8000`.
- All 4xx bodies are `{ error: string }`.
- Button copy: **"Add task"**, **"Edit"**, **"Save"**, **"Cancel"**, **"Delete"**. Dialog title **"Delete task?"**. Page heading **"Task Tracker"**.
- Status filtering and status-dropdown changes must NOT be covered by the hand-written e2e specs.
- Shell note for this machine: prefix commands with `source ~/.nvm/nvm.sh && nvm use 26.8.1 >/dev/null &&`.

---

### Task 1: Workspace scaffold + API (TDD with node:test)

**Files:**
- Create: `.nvmrc`, `.gitignore`, `package.json`
- Create: `api/package.json`, `api/tsconfig.json`, `api/src/store.ts`, `api/src/routes.ts`, `api/src/app.ts`, `api/src/server.ts`
- Test: `api/test/api.test.ts`

**Interfaces:**
- Produces (`api/src/store.ts`):
  - `type TaskStatus = "todo" | "in_progress" | "done"`; `const TASK_STATUSES: readonly TaskStatus[]`
  - `type Task = { id: string; title: string; description: string; status: TaskStatus; createdAt: string }`
  - `createStore(): Store` with `list(status?) : Task[]` (newest first), `get(id): Task | undefined`, `create({ title, description?, status? }): Task`, `update(id, patch): Task | undefined`, `remove(id): boolean`, `reset(): void`
- Produces (`api/src/app.ts`): `buildApp(opts?: { logger?: boolean; delayMs?: number; enableReset?: boolean }): FastifyInstance`
- Produces HTTP contract per spec's Routes table. Error messages: `"Title is required"`, `"Title must be 120 characters or fewer"`, `"Description must be 1000 characters or fewer"`, `"Status must be one of: todo, in_progress, done"`, `"Task not found"`.
- Seed (insertion order, so list shows reverse): `Create repository`/done, `Set up CI pipeline`/in_progress, `Write project README`/todo.

- [ ] **Step 1:** Write root `package.json` (workspaces `api`,`web`,`e2e`; scripts `dev` via concurrently, `test` → `npm test -w api`, `test:e2e` → `npm test -w e2e --`, `test:e2e:ui`, `typecheck` → `npm run typecheck --workspaces --if-present`), `.nvmrc`, `.gitignore`; `api/package.json` (scripts `dev: node --watch src/server.ts`, `start: node src/server.ts`, `test: node --test "test/**/*.test.ts"`, `typecheck: tsc`), `api/tsconfig.json` (nodenext, strict, noEmit, allowImportingTsExtensions, erasableSyntaxOnly, verbatimModuleSyntax).
- [ ] **Step 2:** Write `api/test/api.test.ts` using `buildApp()` + `app.inject()` covering: health; seed list newest-first; `?status=done` filter; invalid status 400; create 201 with defaults + trimmed title; missing / whitespace-only / 121-char title → 400 with exact messages; GET unknown id 404; PATCH status 200; PATCH empty title 400; PATCH unknown 404; DELETE 204 then 404; reset restores seed; reset route absent when `enableReset: false`; unknown route 404 `{error}`.
- [ ] **Step 3:** `npm install`, then `npm test` → FAIL (module not found).
- [ ] **Step 4:** Implement `store.ts` (Map, insertion order, `list` reverses), `routes.ts` (JSON schemas; title `minLength: 1, maxLength: 120, pattern: "\\S"`; error handler mapping `err.validation[0]` to messages; `onRequest` delay hook for `/api/tasks*`; not-found handler), `app.ts`, `server.ts` (reads `PORT`, `API_DELAY_MS`, `NODE_ENV`).
- [ ] **Step 5:** `npm test` → all PASS; `npm run typecheck -w api` → clean.
- [ ] **Step 6:** Smoke: `npm start -w api` then `curl 127.0.0.1:8000/api/tasks`.
- [ ] **Step 7:** Commit `feat(api): in-memory task API with Fastify`.

### Task 2: Web app

**Files:**
- Create: `web/package.json`, `web/tsconfig.json`, `web/vite.config.ts`, `web/index.html`
- Create: `web/src/main.tsx`, `App.tsx`, `api.ts`, `types.ts`, `styles.css`, `components/{TaskForm,FilterTabs,TaskList,TaskItem,ConfirmDialog}.tsx`

**Interfaces:**
- Consumes: HTTP contract from Task 1.
- Produces (accessibility contract the e2e suite and MCP rely on):
  - `heading "Task Tracker"` (h1)
  - `form "New task"` containing `textbox "Title"`, `textbox "Description"`, `button "Add task"`; server error in `alert` inside the form. Form has `noValidate` and the input has no `required` attr (so server validation is visible).
  - `tablist "Filter tasks"` with `tab` All / Todo / In progress / Done, `aria-selected`.
  - `list "Tasks"`; each item is `listitem` named by task title (`aria-label={task.title}`), containing `combobox "Status"`, `button "Edit"`, `button "Delete"`.
  - Edit mode: `form "Edit <title>"` with `textbox "Title"`, `textbox "Description"`, `button "Save"`, `button "Cancel"`, row errors in `alert`.
  - Delete: native `<dialog>` via `showModal()`, named "Delete task?" via `aria-labelledby`, buttons "Cancel" / "Delete".
  - Empty state text "No tasks yet" / "No tasks match this filter".
- `App.handleUpdate` replaces the row with the server response: `ts.map(t => (t.id === updated.id ? updated : t))`, dropping it if it no longer matches the active filter.

- [ ] **Step 1:** Write package/config files; `npm install`.
- [ ] **Step 2:** Write `types.ts`, `api.ts` (`ApiError`, `listTasks`, `createTask`, `updateTask`, `deleteTask`; 4xx `error` body becomes the thrown message).
- [ ] **Step 3:** Write components + `App.tsx` + `styles.css` per the contract above.
- [ ] **Step 4:** `npm run typecheck -w web` and `npm run build -w web` → clean.
- [ ] **Step 5:** Smoke: `npm run dev`, curl `http://127.0.0.1:5173/api/tasks` through the proxy.
- [ ] **Step 6:** Commit `feat(web): React task tracker UI`.

(Behavioral verification of the UI is Task 3's e2e suite.)

### Task 3: Playwright e2e suite

**Files:**
- Create: `e2e/package.json`, `e2e/tsconfig.json`, `e2e/playwright.config.ts`, `e2e/fixtures.ts`, `e2e/pages/TasksPage.ts`
- Test: `e2e/tests/{create-task,edit-task,delete-task,validation,api}.spec.ts`

**Interfaces:**
- Consumes: accessibility contract from Task 2; `/api/reset` from Task 1.
- Produces: `test`/`expect` from `fixtures.ts` (auto `resetData`, `tasksPage`); `TasksPage` with `goto()`, `addTask(title, description?)`, `taskItem(title)`, `editTask(oldTitle, newTitle)`, `deleteTask(title)`, locators `newTaskForm`, `titleInput`, `descriptionInput`, `addButton`, `formError`, `taskList`, `deleteDialog`.

- [ ] **Step 1:** Config per spec (baseURL `http://127.0.0.1:5173`; webServer api `npm run start -w api` → `/api/health`, web `npm run dev -w web`; cwd `..`; 3 browser projects; workers 1; retries/trace/screenshot/reporters).
- [ ] **Step 2:** `fixtures.ts`, `TasksPage.ts`.
- [ ] **Step 3:** Specs: create (appears, at top, form clears); edit (visible right after Save AND after reload; cancel discards); delete (confirm removes, cancel keeps); validation (empty + whitespace → "Title is required", list still 3); api (round-trip, 400, 404).
- [ ] **Step 4:** `npx playwright install chromium firefox webkit`; `npm run test:e2e` → all PASS on all projects (if WebKit system deps are missing locally, note it; CI installs `--with-deps`).
- [ ] **Step 5:** Sanity-check the suite catches regressions: temporarily change `ts.map(... ? updated : t)` to `{ ...updated, ...t }`, confirm edit spec FAILS, revert.
- [ ] **Step 6:** Commit `test(e2e): Playwright suite for task CRUD and validation`.

### Task 4: Claude/MCP setup, CI, README

**Files:**
- Create: `.mcp.json`, `.claude/agents/*` (+ whatever `init-agents` emits), `.github/workflows/e2e.yml`, `README.md`

- [ ] **Step 1:** `.mcp.json` with `playwright` → `npx @playwright/mcp@latest`.
- [ ] **Step 2:** Run `npx playwright init-agents --loop=claude` (from repo root, pointing at e2e config if needed); inspect output; make sure agents land in root `.claude/agents/` and the seed test uses our fixtures; merge any `.mcp.json` it writes with ours.
- [ ] **Step 3:** CI workflow: checkout → setup-node (`node-version-file: .nvmrc`, npm cache) → `npm ci` → `npm run typecheck` → `npm test` → `npx playwright install --with-deps` → `npm run test:e2e` → upload `e2e/playwright-report` if not cancelled.
- [ ] **Step 4:** README: prereqs, install, run, test, "Test suite vs. MCP", demo runbook (Part 1: run suite, UI mode, trace viewer, `API_DELAY_MS=800` auto-wait; Part 2: drive / author / heal / debug beats with example prompts).
- [ ] **Step 5:** Re-run `npm test && npm run typecheck && npm run test:e2e -- --project=chromium` → PASS.
- [ ] **Step 6:** Commit `chore: Claude MCP config, Playwright agents, CI, README`.

### Task 5: `demo/bug` branch

- [ ] **Step 1:** `git switch -c demo/bug`; in `web/src/App.tsx` change the update merge to `{ ...updated, ...t }` (stale fields win).
- [ ] **Step 2:** `npm run test:e2e -- --project=chromium tests/edit-task.spec.ts` → FAIL (proves the bug is observable).
- [ ] **Step 3:** Commit `feat: tweak task update merge` (innocuous message — it's a planted bug); `git switch main`.
