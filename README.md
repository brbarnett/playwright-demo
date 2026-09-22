# Playwright Demo

A small task tracker used to demonstrate:

1. **End-to-end testing with Playwright Test**: a conventional, deterministic suite that runs in CI.
2. **Playwright MCP with Claude Code**: Claude driving a real browser to check UI changes, write new tests, fix broken ones, and debug the app.

**New to Playwright? Start with the [Playwright and Claude guide](docs/playwright-guide.md).** It covers installing, running, writing tests, debugging, and the Claude workflow.

## Quick start

Requires Node 26.8.1 (`nvm install && nvm use`).

```bash
npm install
npx playwright install --with-deps   # browsers + OS libraries (sudo on Linux)

npm run dev        # web: http://localhost:5173   api: http://localhost:8000
npm run test:e2e   # starts both apps automatically, runs the suite
```

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | API + web together (hot reload) |
| `npm test` | API unit tests (`node:test`) |
| `npm run test:e2e` | Playwright suite, all browsers. Pass args after `--`, e.g. `-- --project=chromium` |
| `npm run test:e2e:ui` | Playwright UI mode |
| `npm run report -w e2e` | Open the last HTML report |
| `npm run codegen -w e2e` | Record a test by clicking through the app (needs `npm run dev`) |
| `npm run typecheck` | TypeScript across all workspaces |

`API_DELAY_MS=800` adds latency to every task API call. Use it to show that Playwright waits automatically.

## Layout

```
api/        Fastify + TypeScript, run directly by Node (no build). In-memory store.
web/        Vite + React + TypeScript. Proxies /api → :8000.
e2e/        Playwright Test: config, fixtures, page objects, specs.
specs/      Test plans written by the Playwright planner agent.
.claude/    Playwright test agents (planner, generator, healer) for Claude Code.
.mcp.json   MCP servers: `playwright` (browser) and `playwright-test` (test runner).
docs/       The guide, plus the design spec and implementation plan.
```

## API

| Method | Path | |
|---|---|---|
| GET | `/api/tasks?status=` | List (newest first), optional `todo` / `in_progress` / `done` filter |
| GET | `/api/tasks/:id` | One task |
| POST | `/api/tasks` | `{ title, description?, status? }` |
| PATCH | `/api/tasks/:id` | Any of `title`, `description`, `status` |
| DELETE | `/api/tasks/:id` | |
| POST | `/api/reset` | Restore seed data (disabled when `NODE_ENV=production`) |
| GET | `/api/health` | Readiness check |

Errors are `{ "error": "Title is required" }`-style JSON.

## Demo runbook

A suggested order for a live walkthrough, about 30–45 minutes. Everything runs from `main` except step 7.

**Part 1: Playwright Test**

1. **The app.** `npm run dev`, then show add, edit, delete, filter, and the validation error.
2. **The suite.** Open `e2e/tests/create-task.spec.ts` and `e2e/pages/TasksPage.ts`. Point out the role-based locators, the fixture that resets data, and the page object. Run `npm run test:e2e`.
3. **UI mode.** `npm run test:e2e:ui`. Run `edit-task.spec.ts`, click through the steps (time-travel), and use the locator picker.
4. **Auto-waiting.** Stop `npm run dev`, then run `API_DELAY_MS=800 npm run test:e2e -- --project=chromium`. It's slower, still green, and has no sleeps.
5. **A failure and its trace.** Break something (for example, change the "Add task" copy), run with `--trace on`, and open the report to show the trace. Revert.

**Part 2: Claude + Playwright** (run `claude` in the repo root; check `/mcp` and `/agents` first)

6. **Drive.** *"Open http://localhost:5173, add three tasks for planning an offsite, mark one done, delete another."*
7. **Debug.** `git switch demo/bug`. *"When I edit a task's title and click Save, the old title stays until I refresh. Reproduce it, find the cause, fix it, and run the e2e tests."* Afterwards run `git switch main` (discard Claude's fix with `git checkout .`, or commit it on the branch).
8. **Author.** *"Use the playwright-test-planner agent to plan tests for status filtering and changing status. Save to specs/status.md."* Review the plan, then *"Use the playwright-test-generator agent to generate tests for specs/status.md."* Run them.
9. **Heal** (contrast it with step 7: here the UI change is *intentional*, so the tests are the thing that is out of date). Rename **Add task** to **Create task** in `web/src/components/TaskForm.tsx`, run the suite (red), then *"Use the playwright-test-healer agent to fix the failing tests."*
10. **Close.** Go back to the guide's [workflow diagram](docs/playwright-guide.md#6-the-day-to-day-workflow) and the [Angular + Java section](docs/playwright-guide.md#8-using-this-with-angular--java).

Reset between rehearsals with `git checkout . && git clean -fd e2e/tests specs` (this discards generated tests and plans) and restart `npm run dev`.
