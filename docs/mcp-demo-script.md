# Playwright MCP demo script

A presenter's script for the Claude + Playwright MCP part of the demo, about 25–30 minutes. It expands Part 2 of the README runbook with what to say, what to type, and what to point at. Lines in _italics_ are talk track. Blocks marked **Prompt** get pasted into Claude Code.

## Before you start (5 minutes, off-screen)

1. **Clean tree on `main`:**
   ```bash
   git switch main && git status        # should be clean
   nvm use && npm ci
   ```
2. **Start the app** in its own terminal, and leave it running: `npm run dev`.
3. **Start Claude Code** in the repo root: `claude`.
4. **Check the servers:** `/mcp` should show `playwright` and `playwright-test` both connected. `/agents` should list the planner, generator, and healer.
5. **WSL2 only: confirm the browser won't use the GPU.** A headed Chromium window that uses the GPU has frozen this laptop before (guide §9).
   ```bash
   ps -eo args | grep "playwright mcp" | grep -c no-gpu.json                       # expect ≥ 1
   for p in $(pgrep -f run-test-mcp-server); do tr '\0' '\n' </proc/$p/environ | grep PW_DISABLE_GPU; done   # expect PW_DISABLE_GPU=1
   ```
   If either one is missing, **stop** and fix the local MCP overrides before going on. Don't open UI mode, `codegen`, or `--debug` during the demo. If you want UI mode, use `npm run test:e2e:ui -- --ui-port=0` and open the URL in the Windows browser.
6. **Arrange the screen:** the terminal with Claude on one side, with room for the browser window Claude opens on the other.

## 1. What MCP is (2 minutes, no typing)

_Claude Code on its own can read and write code, but it can't see a running app. MCP, the Model Context Protocol, is how we hand it tools. This repo gives it two, both configured in `.mcp.json`, which is committed:_

- _`playwright`: a real browser Claude can drive, with clicking, typing, reading the page, and watching network traffic._
- _`playwright-test`: our actual test runner, so Claude can list, run, and debug the same tests CI runs._

_There's nothing extra to install. Both ship with `@playwright/test`, so they use the same Playwright version and browsers as the suite._

Show `/mcp` on screen.

## 2. Drive the browser (5 minutes)

**Prompt**

> Open http://localhost:5173, add three tasks for planning a team offsite, mark one of them done, and delete another. Tell me what the list looks like at the end.

While it runs:

- _A real window opened. You can watch every click._
- _It isn't guessing from screenshots. It reads the page's **accessibility snapshot**: every role, name, and state on the page. That's the same tree our `getByRole` locators use. An app that's accessible is also easy to test and easy for an agent to use._
- When the delete confirmation appears: _It handled the confirm dialog, because the dialog has a proper role and name._

**Prompt (optional follow-up, if the room is curious)**

> Show me the accessibility snapshot you're reading for the task list, just the part for one task.

**Prompt**

> Switch to the "Done" filter. Does it show only done tasks? Check the network requests to confirm the filter is applied on the server.

_It just checked the network tab for us: `GET /api/tasks?status=done`. This is the loop Claude uses to check its own work after it changes UI code. It opens the page and looks before it says "done."_

## 3. Debug a real bug (7 minutes)

Stop `npm run dev`, then run `git switch demo/bug` and start `npm run dev` again. In the browser, edit a task's title and click **Save**. The old title stays until you reload.

_This is how a user would report it. No stack trace, no file name._

**Prompt**

> When I edit a task's title and click Save, the old title keeps showing until I refresh. Reproduce it in the browser, find the cause, and fix it. Then run the e2e suite.

Point out each step as it happens:

1. **Reproduce:** it edits a task in the browser and sees the stale title.
2. **Rule out the server:** it checks the `PATCH` response, which already has the new title, so the API is fine.
3. **Find the cause:** it follows the problem into `web/src/task-store.ts`. The update merges the old row _over_ the server's response (`{ ...updated, ...t }`), so the stale values win.
4. **Fix and verify:** it swaps the order back and runs the suite through `playwright-test`. `edit-task.spec.ts` is the test that catches exactly this bug.

_Reproduce, diagnose, fix, verify. It's the same loop you'd follow, just faster._

Afterwards run `git checkout . && git switch main`, then restart `npm run dev`.

## 4. Write tests with the agents (8 minutes)

_The suite deliberately leaves out status filtering and changing a task's status, so the agents have something real to write._

**Prompt**

> Use the playwright-test-planner agent to explore the app and write a test plan for status filtering (the All / Todo / In progress / Done tabs) and for changing a task's status from its dropdown. Save it to `specs/status.md`.

Open `specs/status.md` and scroll through it. _This is the step where a person decides what's worth testing. The plan is plain Markdown, easy to review and easy to edit._

**Prompt**

> Use the playwright-test-generator agent to generate tests for every scenario in `specs/status.md`.

_For each scenario it runs the steps in a live browser, then writes the spec. Because it actually did each step, the locators match the real page._

**Prompt**

> Refactor the new status tests to use our `test` from `e2e/fixtures.ts` and the `TasksPage` page object, adding page-object methods where needed. Then run the full suite.

_Generated tests are a first draft. This step fits them to our conventions, the ones in `CLAUDE.md`._ Show the diff.

If you're short on time, skip the generator and show only the plan.

## 5. Heal after an intentional UI change (5 minutes)

_Compare this with section 3. There the app was broken. Here we change the UI on purpose, so the tests are what's out of date._

In `web/src/components/task-form.ts`, rename the **Add task** button to **Create task**. Run:

```bash
npm run test:e2e -- --project=chromium
```

Several tests fail.

**Prompt**

> Use the playwright-test-healer agent to fix the failing tests.

_It opens each failure in a live browser, sees the button was renamed, and updates the one locator in `TasksPage.ts`. The page object is why this is one fix and not a dozen._

Make one key point clearly: _The healer assumes the app is right. Never run it just to turn a red build green. On a regression, like section 3, it could rewrite a test to accept the bug. Check its diff: changed locators are usually fine, but changed assertions are suspicious._

## 6. Close (2 minutes)

**Prompt**

> Close the browser.

_Recap: one MCP server lets Claude see and drive the app, and the other connects it to our test runner. Together they cover checking UI changes, debugging from a user's report, writing tests, and keeping tests current, all through the same suite CI runs._

Finish on the guide's [workflow diagram](playwright-guide.md#6-the-day-to-day-workflow) and the [Angular + Java section](playwright-guide.md#8-using-this-with-angular--java).

## If something goes wrong

| Symptom                              | Do this                                                                                                  |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------- |
| `/mcp` shows a server as failed      | Quit and restart `claude`. Check that `npm ci` ran.                                                      |
| Claude says the page won't load      | `npm run dev` isn't running, or it's on the wrong branch. Restart it.                                    |
| Data looks odd from an earlier run   | `curl -X POST http://127.0.0.1:8000/api/reset`                                                           |
| The agent wanders or takes too long  | Press Esc, then give it a narrower prompt, such as one scenario only.                                    |
| The machine starts to stutter (WSL2) | Close the browser right away (Esc, then "close the browser"). Continue headless with `npm run test:e2e`. |

## Reset between rehearsals

```bash
git switch main
git checkout . && git clean -fd e2e/tests specs     # removes generated tests and plans
```

Then restart `npm run dev`, and run `/clear` in Claude Code.
