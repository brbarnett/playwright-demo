import { test, expect } from "../fixtures.ts";

// No browser here: Playwright's `request` fixture talks to the API directly.
test.describe("tasks API", () => {
  test("create, read, update, delete", async ({ request }) => {
    const created = await request.post("/api/tasks", { data: { title: "API task" } });
    expect(created.status()).toBe(201);
    const task = await created.json();
    expect(task).toMatchObject({ title: "API task", description: "", status: "todo" });

    const fetched = await request.get(`/api/tasks/${task.id}`);
    expect(await fetched.json()).toEqual(task);

    const patched = await request.patch(`/api/tasks/${task.id}`, { data: { status: "done" } });
    expect(await patched.json()).toMatchObject({ id: task.id, status: "done" });

    expect((await request.delete(`/api/tasks/${task.id}`)).status()).toBe(204);
    expect((await request.get(`/api/tasks/${task.id}`)).status()).toBe(404);
  });

  test("rejects a missing title", async ({ request }) => {
    const res = await request.post("/api/tasks", { data: {} });
    expect(res.status()).toBe(400);
    expect(await res.json()).toEqual({ error: "Title is required" });
  });

  test("returns 404 for an unknown task", async ({ request }) => {
    const res = await request.get("/api/tasks/does-not-exist");
    expect(res.status()).toBe(404);
    expect(await res.json()).toEqual({ error: "Task not found" });
  });
});
