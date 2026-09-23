# Playwright and Claude: A Practical Guide

This guide explains how to install Playwright, get it running, and use it to **write** and **debug** end-to-end tests, both by hand and with Claude Code. It uses this repo's Task Tracker app for every example, but nothing here depends on the web framework or Node. The last section shows how to set up the same thing for an Angular + Java app.

- [1. The mental model](#1-the-mental-model)
- [2. Install and run](#2-install-and-run)
- [3. Writing tests by hand](#3-writing-tests-by-hand)
- [4. Debugging tests](#4-debugging-tests)
- [5. Claude + Playwright](#5-claude--playwright)
- [6. The day-to-day workflow](#6-the-day-to-day-workflow)
- [7. Running in CI](#7-running-in-ci)
- [8. Using this with Angular + Java](#8-using-this-with-angular--java)
- [9. Tips and gotchas](#9-tips-and-gotchas)

---

## 1. The mental model

Playwright is **one tool used in two ways**:

| | Playwright **Test** (the test runner) | Playwright **MCP** (Claude's browser) |
|---|---|---|
| **What it is** | A test framework: you write `*.spec.ts` files, it runs them in real browsers | A server that gives an AI agent a real browser it can see and control |
| **Who drives** | The test code | Claude, following your instructions |
| **Deterministic?** | Yes. The same result every run | No. It's an interactive session |
| **Where it runs** | Your machine and CI, on every PR | Your machine, while you work with Claude |
| **What it produces** | Pass/fail, HTML report, traces | Actions in the browser, plus code Claude writes (for example, new tests) |

**The test suite is the thing you keep.** It gates merges and it doesn't use AI.
**MCP is how Claude reaches the running app**: to check its own UI changes, to reproduce bugs, and to write and repair the test suite. Claude using MCP doesn't replace the test suite. It helps produce and maintain it.

---

## 2. Install and run

### Prerequisites

- **Node.js 26.8.1** (pinned in `.nvmrc`). With [nvm](https://github.com/nvm-sh/nvm): `nvm install && nvm use`.
- **Git**.
- For the Claude part: **Claude Code** (see [5.1](#51-setup)).

### Get the repo working

```bash
git clone https://github.com/brbarnett/playwright-demo.git
cd playwright-demo
npm install                         # installs all three workspaces: api, web, e2e
npx playwright install --with-deps  # downloads Chromium, Firefox, WebKit + OS libraries
```

> `--with-deps` installs the system libraries the browsers need. It asks for `sudo` on Linux.
> If you can't use sudo, `npx playwright install chromium` is enough for local work.

### Run the app

```bash
npm run dev
```

- Web: http://localhost:5173
- API: http://localhost:8000/api/tasks

The data lives in memory and resets when the API restarts.

### Run the tests

```bash
npm run test:e2e                         # all browsers, headless
npm run test:e2e -- --project=chromium   # one browser
npm run test:e2e -- tests/edit-task.spec.ts
npm run test:e2e:ui                      # UI mode (interactive, see §4)
```

You don't need to start the app first. `e2e/playwright.config.ts` has a `webServer` section that starts the API and the web app, waits until they're up, runs the tests, and shuts everything down. If `npm run dev` is already running, the tests reuse it.

---

## 3. Writing tests by hand

### Anatomy of a test

```ts
// e2e/tests/create-task.spec.ts
import { test, expect } from "../fixtures.ts";

test.describe("creating a task", () => {
  test.beforeEach(async ({ tasksPage }) => {
    await tasksPage.goto();
  });

  test("adds the task to the list", async ({ tasksPage }) => {
    await tasksPage.addTask("Book client demo", "Playwright + Claude walkthrough");

    const item = tasksPage.taskItem("Book client demo");
    await expect(item).toBeVisible();
    await expect(item).toContainText("Playwright + Claude walkthrough");
  });
});
```

Three ideas cover most of Playwright:

**Locators find elements the way a user would.** Prefer role and label locators:

```ts
page.getByRole("button", { name: "Add task" });
page.getByLabel("Title");
page.getByRole("listitem", { name: "Write project README" });
```

These use the page's accessibility tree, so they don't break when CSS classes or DOM structure change. They also push the app toward being accessible. (Avoid `page.locator(".btn-primary > span")`.)

**Waiting is automatic.** Actions such as `click()` and `fill()` wait until the element is visible, enabled, and stable. Assertions such as `expect(locator).toBeVisible()` retry until they pass or time out. **You never write `sleep`.** To see this, run `API_DELAY_MS=800 npm run test:e2e`. Every API call gets slower and every test still passes, unchanged.

**Fixtures provide setup.** `e2e/fixtures.ts` extends the base `test` so that every test:
1. resets the API's data, both tasks and settings (`POST /api/reset`), before it starts, and
2. can ask for page objects (`tasksPage`, `settingsPage`) by name.

Fixtures *construct* page objects but don't navigate. Each test (or its `beforeEach`) calls `goto()`, so a test that uses two pages decides the order itself.

### Page objects

`e2e/pages/` holds one class per page: `TasksPage.ts` and `SettingsPage.ts`. It also holds `MainNav.ts` for the nav bar that both pages share. A page object gives the page's elements and actions names that match what they do (`addTask`, `deleteTask`, `save`). Tests read like user stories, and when the UI changes you update one file instead of every test. The healer demo in [5.4](#54-keeping-tests-working-the-healer) shows why: renaming a button breaks many tests, and the fix is one line.

### 3.1 Adding a test, step by step

The suite doesn't test the filter tabs yet. Here's how you'd add that by hand. (This walkthrough isn't committed, so the agents in [5.3](#53-writing-tests-with-claude-planner--generator) still have something to write.)

**1. Create the spec file.** Put it in `e2e/tests/`, name it after the feature, and end it in `.spec.ts`. Playwright only picks up files matching that pattern.

```ts
// e2e/tests/filter-tasks.spec.ts
import { test, expect } from "../fixtures.ts";   // ← our fixtures, not "@playwright/test"
```

Importing from `../fixtures.ts` is what gives you the data reset and the page objects. If you import `@playwright/test` directly, your test runs against whatever data the previous test left behind.

**2. Add what's missing to the page object.** `TasksPage` can already find a tab (`filterTab`), but it has no action for clicking one. Add it there, not in the test, so the next test can reuse it:

```ts
// e2e/pages/TasksPage.ts
async filterBy(label: FilterLabel) {
  await this.filterTab(label).click();
}
```

**3. Write the test.** Assert what a user would see. The seed data has exactly one done task, "Create repository":

```ts
test.describe("filtering tasks", () => {
  test.beforeEach(async ({ tasksPage }) => {
    await tasksPage.goto();
  });

  test("the Done tab shows only done tasks", async ({ tasksPage }) => {
    await tasksPage.filterBy("Done");

    await expect(tasksPage.filterTab("Done")).toHaveAttribute("aria-selected", "true");
    await expect(tasksPage.tasks).toHaveCount(1);
    await expect(tasksPage.taskItem("Create repository")).toBeVisible();
  });
});
```

**4. Run just that file** while you work on it:

```bash
npm run test:e2e -- tests/filter-tasks.spec.ts --project=chromium
```

**5. Prove it can fail.** A test that has never failed might not be testing anything. Break the feature on purpose. For example, in `web/src/task-store.ts`, change `api.listTasks(filter === "all" ? undefined : filter)` to `api.listTasks(undefined)`. Run the test again and it should fail with `Expected: 1, Received: 3`. Then revert your change.

**6. Run the whole suite** (`npm run test:e2e`) before you open a PR, and let CI run all three browsers.

### 3.2 When the app grows: a second page

The Settings page (`/settings`) shows what adding a page involves. Its settings are stored by the API (`GET`/`PATCH /api/settings`) and change how the Tasks page behaves.

**One page object per page.** `e2e/pages/SettingsPage.ts` follows the same pattern as `TasksPage`: locators by role and label, plus actions such as `save()`. Parts shared by several pages, such as the nav bar, get their own small *component object* (`MainNav.ts`) that each page exposes as `nav`.

```ts
// e2e/pages/SettingsPage.ts (excerpt)
this.confirmDelete = this.form.getByRole("checkbox", { name: "Confirm before deleting" });

defaultFilter(label: FilterLabel) {
  return this.form.getByRole("group", { name: "Default filter" }).getByRole("radio", { name: label });
}

/** Saves and waits for the server to confirm, so the next step sees the new settings. */
async save() {
  await this.saveButton.click();
  await expect(this.savedMessage).toHaveText("Settings saved");
}
```

Note the last line of `save()`. It waits for the app to confirm the save before the test moves on. Without it, a test that saves and then immediately goes to another page might get there before the server has stored anything.

**Register it as a fixture** in `e2e/fixtures.ts`, so tests can ask for it by name:

```ts
type Fixtures = { resetData: void; tasksPage: TasksPage; settingsPage: SettingsPage };

settingsPage: async ({ page }, use) => {
  await use(new SettingsPage(page));
},
```

**Write tests that cross pages.** Both page objects share the same browser `page`, so a test can change a setting and check its effect elsewhere:

```ts
// e2e/tests/settings.spec.ts
test("deletes without asking when confirmation is off", async ({ settingsPage, tasksPage }) => {
  await settingsPage.goto();
  await settingsPage.confirmDelete.uncheck();
  await settingsPage.save();

  await settingsPage.nav.link("Tasks").click();
  await tasksPage.clickDelete("Create repository");

  await expect(tasksPage.deleteDialog).toBeHidden();
  await expect(tasksPage.taskItem("Create repository")).toHaveCount(0);
});
```

**Mind where state lives.** Playwright gives every test a fresh browser context: new cookies, empty `localStorage`, no leftovers. **Server state is different.** Settings saved by one test would still be there for the next one. That's why `/api/reset` resets settings as well as tasks. Whenever you add something the server stores, add it to the reset too.

### 3.3 Asking Claude to write a test

You don't need the planner and generator agents ([5.3](#53-writing-tests-with-claude-planner--generator)) for everyday tests. For a single behavior, just ask:

> *Add an e2e test that the Escape key closes the delete confirmation without deleting the task. Follow the conventions in e2e/: use our fixtures and page objects, add page-object methods if you need them, then run the new test and the full Chromium suite.*

The repo's [`CLAUDE.md`](../CLAUDE.md) spells out those conventions (fixtures import, page objects, role-based locators, and the "prove it fails" step). Claude Code reads it automatically at the start of every session, so every session writes tests the same way. Keep it up to date as your conventions change.

Use the **agents** when you want coverage for a whole area and a plan to review first. Use a **direct request** when you already know the one test you want.

### API tests

The same runner can test HTTP APIs directly, with no browser. See `e2e/tests/api.spec.ts`:

```ts
test("rejects a missing title", async ({ request }) => {
  const res = await request.post("/api/tasks", { data: {} });
  expect(res.status()).toBe(400);
});
```

### Recording a test (codegen)

```bash
npm run dev            # in one terminal
npm run codegen -w e2e # in another
```

A browser opens next to the Playwright Inspector. Click through a flow and Playwright writes the test code as you go, choosing role-based locators. Copy the result into a spec, then rework it to use the fixtures and page objects. It's a good way to start a test, but it isn't finished code. (On WSL2, see the headed-browser note in [§9](#9-tips-and-gotchas) first.)

---

## 4. Debugging tests

Pick the tool that fits the situation.

### UI mode: the everyday debugger

```bash
npm run test:e2e:ui
```

A desktop app where you can:
- run a single test and watch it in a live browser,
- **time-travel**: click any step to see the DOM, network calls, and console output at that moment,
- use the locator picker to hover over an element and get its locator,
- turn on watch mode so tests re-run when you save.

### Step through with the inspector

```bash
npm run test:e2e -- --project=chromium --debug tests/edit-task.spec.ts
```

This opens a headed browser that's paused before the first action. You step through one action at a time and try locators live. Adding `await page.pause()` anywhere in a test also stops it there.

### Traces: the "flight recorder" for CI failures

When a test fails in CI and passes locally, look at the trace. This repo records one on the first retry (`trace: "on-first-retry"`). Download the `playwright-report` artifact from the GitHub Actions run, then:

```bash
npx playwright show-report path/to/playwright-report
# or open one trace directly:
npx playwright show-trace path/to/trace.zip
```

The trace includes every action, a DOM snapshot before and after each one, network traffic, console output, and the test source, so you can debug a failure without reproducing it.

### HTML report

After any run: `npm run report` from the repo root. The report is written to `e2e/playwright-report/`, next to the config, so a bare `npx playwright show-report` at the root won't find it. It shows failures, error messages, screenshots of failures, and traces.

### VS Code

The official **Playwright Test for VS Code** extension adds run and debug buttons next to each test, breakpoints, "pick locator", and "record new". It's the UI-mode experience inside the editor.

---

## 5. Claude + Playwright

### 5.1 Setup

1. **Install Claude Code** (details at https://docs.claude.com/en/docs/claude-code):
   ```bash
   curl -fsSL https://claude.ai/install.sh | bash    # or: npm install -g @anthropic-ai/claude-code
   ```
2. **Open the project:** `cd playwright-demo && claude`
3. **Approve the project's MCP servers** when Claude Code asks. They're defined in `.mcp.json`, which is committed, so everyone on the team gets the same setup:

   | Server | Command | Purpose |
   |---|---|---|
   | `playwright` | `npx playwright mcp --browser chromium --isolated` | A general-purpose browser Claude can drive |
   | `playwright-test` | `npx playwright run-test-mcp-server --config e2e/playwright.config.ts` | Connects Claude to the **test runner**: list, run, and debug tests, and write specs |

   Both come with `@playwright/test`, so there's nothing extra to install, and they use the same pinned Playwright version and browsers as the test suite.
4. **Check that it's working:** type `/mcp` in Claude Code. Both servers should say *connected*. Type `/agents` and you should see `playwright-test-planner`, `playwright-test-generator`, and `playwright-test-healer`.

> **How the agents got here:** `npx playwright init-agents --loop=claude` generated `.claude/agents/*.md`, `e2e/tests/seed.spec.ts`, `specs/`, and the `playwright-test` entry in `.mcp.json`. Re-run it after upgrading Playwright to get updated agent definitions.

### 5.2 Is it interactive? Yes.

When Claude uses the `playwright` server, **a real browser window opens on your screen** and you watch Claude work in it. Claude doesn't look at screenshots by default. It reads the page's **accessibility snapshot**, a structured list of every role, name, and state on the page, and acts on that. This is the same tree that `getByRole` locators use, which is why an accessible app is also one that's easy to test and easy for an agent to use.

Start the app (`npm run dev`), then try:

> *Open http://localhost:5173, add three tasks about planning a team offsite, mark one of them done, and delete another. Tell me what the list looks like at the end.*

> *Switch to the "Done" filter. Does it only show done tasks? Check the network requests to confirm the filter is applied on the server.*

This is the same loop Claude uses to **check its own work**: after changing UI code, it opens the page and confirms the change actually works before saying it's done. You can make that a habit by writing it into your project's `CLAUDE.md` or by asking for it.

### 5.3 Writing tests with Claude: planner → generator

The suite in this repo deliberately **doesn't cover status filtering or changing a task's status** so there's something left for the agents to write.

**Step 1: Plan.** Ask:

> *Use the playwright-test-planner agent to explore the app and write a test plan for status filtering (the All / Todo / In progress / Done tabs) and for changing a task's status from its dropdown. Save it to `specs/status.md`.*

The planner runs `e2e/tests/seed.spec.ts` to put the app in a known state, explores the UI in a browser, and writes a Markdown plan of scenarios, steps, and expected results. **Read it before moving on.** This is where a person decides what's worth testing.

**Step 2: Generate.**

> *Use the playwright-test-generator agent to generate tests for every scenario in `specs/status.md`.*

For each scenario, the generator performs the steps in a live browser, records what worked, and writes a spec file under `e2e/tests/`. Because it actually ran each step, the locators and assertions match the real page.

**Step 3: Review and fit it to your conventions.** Generated tests are a strong first draft. A reasonable next request:

> *Refactor the new status tests to use our `test` from `e2e/fixtures.ts` and the `TasksPage` page object, adding page-object methods where needed. Then run the full suite.*

Then look at the diff the way you'd review any pull request.

### 5.4 Keeping tests working: the healer

**The healer fixes tests, never the app.** It assumes the app is right and the test is out of date. That makes it a *maintenance* tool, not a debugging tool. A test fails for one of three reasons:

| Why the test failed | What's wrong | Right fix | Use the healer? |
|---|---|---|---|
| Intentional UI change (renamed button, restructured form) | The test is out of date | Update the test | **Yes. This is its job.** |
| Flaky test (timing assumption, fragile selector) | The test is badly written | Make the test more robust | Yes |
| Regression (the app broke) | The app | Fix the app | **No.** Debug it instead (see [5.5](#55-debugging-the-app-with-claude)) |

In a healthy suite most failures come from the first row. Someone changes the UI on purpose and a dozen tests break on stale selectors. The healer does that tedious update for you. The risk is running it on a *regression*, where it may rewrite a test to accept broken behavior. So:

- **Only run it when you know the UI change was intentional**, ideally in the same PR as the change, so reviewers see the app change and the test updates together.
- **Never run it just to turn a red build green.** Red means "find out why."
- **Check what it changed.** Updated *locators* are usually fine. Changed *assertions* (what the test expects to happen) deserve suspicion.

To try it out, rename the **Add task** button to **Create task** in `web/src/components/task-form.ts`, then run `npm run test:e2e -- --project=chromium`. Several tests fail. Then ask:

> *Use the playwright-test-healer agent to fix the failing tests.*

The healer runs the suite, stops at each failure in a live browser, inspects the page to find what changed, and updates the test code, which here is the locator in `TasksPage.ts`. It re-runs until the tests pass. If it's confident the *test* is correct and the *app* is wrong, it doesn't change the test to match the bug. It marks the test `test.fixme()` (skipped) and adds a comment explaining what the app does instead.

> **Judgment call:** the healer isn't interactive and can't tell whether you *meant* to rename the button. "Tests fail after a UI change" means either the test is out of date or the app is broken. Review its diff before accepting the fix, and **treat any new `test.fixme()` as a bug report**: a skipped test is a passing build that hides a problem.

### 5.5 Debugging the app with Claude

The `demo/bug` branch has a planted bug. Try it:

```bash
git switch demo/bug
npm run dev
```

Edit a task's title and click **Save**. The old title is still shown until you reload the page. Now tell Claude what you're seeing, the way a user would report it:

> *When I edit a task's title and click Save, the old title keeps showing until I refresh. Reproduce it in the browser, find the cause, and fix it. Then run the e2e suite.*

Claude reproduces the problem in the browser, checks the network tab (the `PATCH` returns the new title, so the server is fine), follows the problem into the task store's signal update, fixes it, and runs `edit-task.spec.ts`, which catches this exact bug, to confirm. That's a complete debugging loop: reproduce, diagnose, fix, verify.

---

## 6. The day-to-day workflow

```
  build a feature ──► Claude checks it in the browser (playwright MCP)
        │
        ▼
  planner explores ──► human reviews plan ──► generator writes specs ──► human reviews PR
                                                                              │
                                                                              ▼
                                                            CI runs the suite on every PR
                                                            (deterministic, no AI)
                                                                              │
                     UI changes, tests break ◄────────────────────────────────┘
                              │
                              ▼
               healer fixes the tests  ──or──  it's a real bug → fix the app
```

People make the decisions: what to test, whether a change was intended, and whether generated code is good enough. Claude does the legwork: exploring, recording, writing, and repairing tests.

---

## 7. Running in CI

`.github/workflows/e2e.yml` runs on every push to `main` and every pull request:

1. `npm ci`
2. typecheck and API unit tests
3. `npx playwright install --with-deps`
4. `npm run test:e2e` on Chromium, Firefox, and WebKit, with 2 retries in CI
5. uploads `playwright-report/` as an artifact, **including traces for failed tests**

In CI, `webServer` always starts fresh servers (`reuseExistingServer: !process.env.CI`), and `forbidOnly` fails the build if someone accidentally commits a `test.only`.

---

## 8. Using this with Angular + Java

Playwright doesn't care what the app is built with. It drives a browser at a URL. For an Angular front end and a Spring Boot back end:

```bash
# in a separate e2e/ folder (or inside the Angular workspace)
npm init playwright@latest
```

Then point `webServer` at your real start commands:

```ts
// playwright.config.ts
webServer: [
  {
    command: "./mvnw spring-boot:run",
    cwd: "../backend",
    url: "http://localhost:8080/actuator/health",
    timeout: 120_000,               // JVM startup is slower than Node's
    reuseExistingServer: !process.env.CI,
  },
  {
    command: "npx ng serve --port 4200",
    cwd: "../frontend",
    url: "http://localhost:4200",
    reuseExistingServer: !process.env.CI,
  },
],
use: { baseURL: "http://localhost:4200" },
```

Everything else in this guide applies unchanged: locators, fixtures, page objects, UI mode, traces, `.mcp.json`, and the agents (`npx playwright init-agents --loop=claude`). For test data, the usual Spring approach is a test-only profile that exposes a reset/seed endpoint (like this repo's `/api/reset`) or uses a disposable database per run, for example Testcontainers.

---

## 9. Tips and gotchas

- **Accessible markup makes tests easier to write.** Real `<label>`s, `<button>`s, and ARIA names make `getByRole` locators simple and make Claude's page snapshots clear. If a test needs a long CSS selector, the app usually needs a label.
- **Isolate test data.** This demo resets shared in-memory data before each test and runs tests one at a time (`workers: 1`) to keep things simple. Real suites should give each test its own data (unique records, or a backend per worker) so they can run fully in parallel.
- **Review agent-written tests like any other code.** Look for tests that pass without checking anything useful, locators that depend on text likely to change, and duplicated setup.
- **WebKit on Linux** needs extra system libraries. `npx playwright install --with-deps` installs them (it needs sudo). Without them, run `--project=chromium --project=firefox` locally and let CI cover WebKit.
- **Headed browsers on WSL2 can freeze Windows.** On some machines, especially laptops with two GPUs, a visible Chromium window that WSL renders through the Windows GPU can bring the whole PC to a near-standstill. Headless runs aren't affected. The fix is to render on the CPU, which is fine for ordinary web apps. It's a per-machine setting, so none of this goes in the repo. There are two levels:
  - **All of WSL (simplest, covers everything).** Add this to `C:\Users\<you>\.wslconfig`, then run `wsl --shutdown` from Windows:
    ```ini
    [wsl2]
    gpuSupport=false
    ```
    Linux GUI apps still work, just rendered in software. You lose GPU compute inside WSL (CUDA, ML frameworks), so skip this if you need that.
  - **Per tool**, if you need to keep WSL's GPU:
    - Tests and the `playwright-test` agents: set `PW_DISABLE_GPU=1` (read by `e2e/playwright.config.ts`).
    - Both MCP servers: add local overrides, which take precedence over `.mcp.json` and aren't committed, then restart Claude Code or reconnect in `/mcp`:
      ```bash
      # ~/.config/playwright-mcp/no-gpu.json → {"browser":{"launchOptions":{"args":["--disable-gpu"]}}}
      claude mcp add-json playwright --scope local \
        '{"type":"stdio","command":"npx","args":["playwright","mcp","--browser","chromium","--isolated","--output-dir",".playwright-mcp","--config","'"$HOME"'/.config/playwright-mcp/no-gpu.json"]}'
      claude mcp add-json playwright-test --scope local \
        '{"type":"stdio","command":"npx","args":["playwright","run-test-mcp-server","--config","e2e/playwright.config.ts"],"env":{"PW_DISABLE_GPU":"1"}}'
      ```
    - **Codegen, the Inspector (`--debug`, `page.pause()`), the UI-mode window, and the trace viewer can't be covered this way.** Playwright launches those windows with fixed settings. Instead, serve UI mode and traces to your *Windows* browser (`npm run test:e2e:ui -- --ui-port=8080`, `npx playwright show-trace --port 9323 trace.zip`), and avoid codegen and `--debug` on an affected machine.
- **Tests run against your *running* dev server.** Locally, `reuseExistingServer` means that if `npm run dev` is already up, the tests use it instead of starting fresh servers. If that server is stale (for example, a file watcher missed a change), the tests exercise old code and fail for reasons that don't match what's on disk. When failures don't make sense, restart `npm run dev` first. CI always starts fresh servers, so it's never affected.
- **MCP output** (screenshots and similar) goes to `.playwright-mcp/`, which is git-ignored.
- **Use headed mode for demos.** Both MCP servers open a visible browser by default. Add `--headless` to their args in `.mcp.json` if you'd rather not see it.
