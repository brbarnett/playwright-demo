# Playwright Demo

A Task Tracker (Fastify API + Vite/React web) used to demo Playwright e2e testing and Playwright MCP with Claude Code. See `README.md` for commands and `docs/playwright-guide.md` for the full guide.

## Layout

- `api/`: Fastify + TypeScript, run directly by Node 26 (no build). In-memory stores for tasks (`store.ts`) and settings (`settings.ts`). Unit tests in `api/test/` (`node:test`).
- `web/`: Vite + React + React Router. Pages in `web/src/pages/`, shared components in `web/src/components/`.
- `e2e/`: Playwright Test. Config, `fixtures.ts`, page objects in `pages/`, specs in `tests/`.
- `specs/`: Markdown test plans from the `playwright-test-planner` agent (not runnable code).

## Commands

Use Node 26.8.1 (`nvm use`). Older Node fails with `Unknown file extension ".ts"`.

- `npm run dev`: API on :8000 + web on :5173
- `npm test`: API unit tests
- `npm run typecheck`: all workspaces
- `npm run test:e2e -- --project=chromium`: e2e suite, one browser. Omit `--project` for all three.
- `npm run test:e2e -- tests/<file>.spec.ts --project=chromium`: a single spec

## Writing e2e tests

- **Import `test` and `expect` from `../fixtures.ts`**, never from `@playwright/test`. The fixtures reset server data (`POST /api/reset`) before every test and provide the page objects.
- **Use page objects** (`tasksPage`, `settingsPage`) for anything that touches the UI. If one is missing an action or locator you need, add it to the page object in `e2e/pages/`. Don't write raw locators in specs. Shared UI such as the nav bar has its own component object (`MainNav`).
- **Navigate explicitly.** Fixtures construct page objects but don't navigate. Call `goto()` in the test or its `beforeEach`.
- **Locators by role and label only** (`getByRole`, `getByLabel`), never CSS or XPath. If something can't be found by role, fix the app's markup (label, ARIA name) rather than the locator.
- **Assert what a user sees**, using web-first assertions (`toBeVisible`, `toHaveText`, `toHaveCount`, `toBeChecked`). No `waitForTimeout`, no `networkidle`.
- **After saving something, wait for the app's confirmation** (for example, `SettingsPage.save()` waits for "Settings saved") before moving to another page.
- **New server-side state must be reset.** If you add anything the API stores, add it to `/api/reset` too, or it leaks between tests.
- **Prove a new test can fail:** break the behavior briefly, watch the test fail for the right reason, revert.
- Status filtering and changing status from the dropdown are **deliberately untested**. They're kept for the planner/generator demo. Don't add tests for them unless asked.

## Healer rule

The `playwright-test-healer` agent only updates tests to match the app. Use it only when a UI change was intentional. If a test fails because the app regressed, fix the app instead.

## WSL2: headed-browser caution

On some WSL2 laptops with GPU passthrough, a **headed** Chromium window has frozen the whole Windows host (see the guide, §9). Run tests headless (the default). Don't run `codegen`, `--debug`, `--headed`, or UI mode unless the machine is known to be safe or `.wslconfig` has `gpuSupport=false`. When using the Playwright MCP browser, close it when you're done.
