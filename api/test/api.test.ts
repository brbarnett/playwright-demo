import { test } from "node:test";
import assert from "node:assert/strict";
import { buildApp } from "../src/app.ts";

const SEED_TITLES = ["Write project README", "Set up CI pipeline", "Create repository"];

test("GET /api/health reports ok", async () => {
  const app = buildApp();
  const res = await app.inject({ method: "GET", url: "/api/health" });
  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.json(), { ok: true });
});

test("GET /api/tasks lists seed tasks newest first", async () => {
  const app = buildApp();
  const res = await app.inject({ method: "GET", url: "/api/tasks" });
  assert.equal(res.statusCode, 200);
  assert.deepEqual(
    res.json().map((t: { title: string }) => t.title),
    SEED_TITLES,
  );
});

test("GET /api/tasks?status= filters by status", async () => {
  const app = buildApp();
  const res = await app.inject({ method: "GET", url: "/api/tasks?status=done" });
  assert.equal(res.statusCode, 200);
  assert.deepEqual(
    res.json().map((t: { title: string }) => t.title),
    ["Create repository"],
  );
});

test("GET /api/tasks rejects an unknown status", async () => {
  const app = buildApp();
  const res = await app.inject({ method: "GET", url: "/api/tasks?status=nope" });
  assert.equal(res.statusCode, 400);
  assert.deepEqual(res.json(), { error: "Status must be one of: todo, in_progress, done" });
});

test("POST /api/tasks creates a task with defaults and a trimmed title", async () => {
  const app = buildApp();
  const res = await app.inject({
    method: "POST",
    url: "/api/tasks",
    payload: { title: "  Buy milk  " },
  });
  assert.equal(res.statusCode, 201);
  const task = res.json();
  assert.equal(task.title, "Buy milk");
  assert.equal(task.description, "");
  assert.equal(task.status, "todo");
  assert.match(task.id, /^[0-9a-f-]{36}$/);
  assert.ok(!Number.isNaN(Date.parse(task.createdAt)));

  const list = await app.inject({ method: "GET", url: "/api/tasks" });
  assert.equal(list.json()[0].title, "Buy milk");
});

for (const [name, payload, error] of [
  ["missing title", {}, "Title is required"],
  ["empty title", { title: "" }, "Title is required"],
  ["whitespace-only title", { title: "   " }, "Title is required"],
  ["too-long title", { title: "x".repeat(121) }, "Title must be 120 characters or fewer"],
  ["too-long description", { title: "ok", description: "x".repeat(1001) }, "Description must be 1000 characters or fewer"],
  ["bad status", { title: "ok", status: "later" }, "Status must be one of: todo, in_progress, done"],
] as const) {
  test(`POST /api/tasks rejects ${name}`, async () => {
    const app = buildApp();
    const res = await app.inject({ method: "POST", url: "/api/tasks", payload });
    assert.equal(res.statusCode, 400);
    assert.deepEqual(res.json(), { error });
  });
}

test("GET /api/tasks/:id returns 404 for an unknown id", async () => {
  const app = buildApp();
  const res = await app.inject({ method: "GET", url: "/api/tasks/nope" });
  assert.equal(res.statusCode, 404);
  assert.deepEqual(res.json(), { error: "Task not found" });
});

test("PATCH /api/tasks/:id updates fields", async () => {
  const app = buildApp();
  const [first] = (await app.inject({ method: "GET", url: "/api/tasks" })).json();
  const res = await app.inject({
    method: "PATCH",
    url: `/api/tasks/${first.id}`,
    payload: { status: "done", title: " Renamed " },
  });
  assert.equal(res.statusCode, 200);
  assert.equal(res.json().status, "done");
  assert.equal(res.json().title, "Renamed");

  const fetched = await app.inject({ method: "GET", url: `/api/tasks/${first.id}` });
  assert.equal(fetched.json().title, "Renamed");
});

test("PATCH /api/tasks/:id rejects an empty title", async () => {
  const app = buildApp();
  const [first] = (await app.inject({ method: "GET", url: "/api/tasks" })).json();
  const res = await app.inject({
    method: "PATCH",
    url: `/api/tasks/${first.id}`,
    payload: { title: "" },
  });
  assert.equal(res.statusCode, 400);
  assert.deepEqual(res.json(), { error: "Title is required" });
});

test("PATCH /api/tasks/:id returns 404 for an unknown id", async () => {
  const app = buildApp();
  const res = await app.inject({ method: "PATCH", url: "/api/tasks/nope", payload: { status: "done" } });
  assert.equal(res.statusCode, 404);
});

test("DELETE /api/tasks/:id removes the task", async () => {
  const app = buildApp();
  const [first] = (await app.inject({ method: "GET", url: "/api/tasks" })).json();
  const res = await app.inject({ method: "DELETE", url: `/api/tasks/${first.id}` });
  assert.equal(res.statusCode, 204);
  const again = await app.inject({ method: "DELETE", url: `/api/tasks/${first.id}` });
  assert.equal(again.statusCode, 404);
});

test("POST /api/reset restores seed data", async () => {
  const app = buildApp();
  await app.inject({ method: "POST", url: "/api/tasks", payload: { title: "Temp" } });
  const res = await app.inject({ method: "POST", url: "/api/reset" });
  assert.equal(res.statusCode, 204);
  const list = await app.inject({ method: "GET", url: "/api/tasks" });
  assert.deepEqual(
    list.json().map((t: { title: string }) => t.title),
    SEED_TITLES,
  );
});

test("POST /api/reset is not available when disabled", async () => {
  const app = buildApp({ enableReset: false });
  const res = await app.inject({ method: "POST", url: "/api/reset" });
  assert.equal(res.statusCode, 404);
});

test("unknown routes return a JSON 404", async () => {
  const app = buildApp();
  const res = await app.inject({ method: "GET", url: "/api/nope" });
  assert.equal(res.statusCode, 404);
  assert.deepEqual(res.json(), { error: "Not found" });
});
