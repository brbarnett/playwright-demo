import { setTimeout as sleep } from "node:timers/promises";
import type { FastifyError, FastifyInstance } from "fastify";
import { TASK_STATUSES, type NewTask, type Store, type TaskPatch, type TaskStatus } from "./store.ts";

export type RouteOptions = {
  delayMs: number;
  enableReset: boolean;
};

const MESSAGES = {
  titleRequired: "Title is required",
  titleTooLong: "Title must be 120 characters or fewer",
  descriptionTooLong: "Description must be 1000 characters or fewer",
  badStatus: `Status must be one of: ${TASK_STATUSES.join(", ")}`,
  notFound: "Task not found",
};

const titleSchema = { type: "string", minLength: 1, maxLength: 120, pattern: "\\S" } as const;
const descriptionSchema = { type: "string", maxLength: 1000 } as const;
const statusSchema = { type: "string", enum: TASK_STATUSES } as const;

const createBody = {
  type: "object",
  required: ["title"],
  properties: { title: titleSchema, description: descriptionSchema, status: statusSchema },
} as const;

const patchBody = {
  type: "object",
  properties: { title: titleSchema, description: descriptionSchema, status: statusSchema },
} as const;

const listQuery = {
  type: "object",
  properties: { status: statusSchema },
} as const;

// Turn Fastify's first schema violation into a message a person can read.
function validationMessage(err: FastifyError): string {
  const issue = err.validation?.[0];
  if (!issue) return "Invalid request";
  const field =
    issue.keyword === "required"
      ? String(issue.params.missingProperty)
      : issue.instancePath.replace(/^\//, "");
  switch (field) {
    case "title":
      return issue.keyword === "maxLength" ? MESSAGES.titleTooLong : MESSAGES.titleRequired;
    case "description":
      return MESSAGES.descriptionTooLong;
    case "status":
      return MESSAGES.badStatus;
    default:
      return "Invalid request";
  }
}

export function registerRoutes(app: FastifyInstance, store: Store, opts: RouteOptions): void {
  app.setErrorHandler<FastifyError>((err, _req, reply) => {
    if (err.validation) {
      return reply.code(400).send({ error: validationMessage(err) });
    }
    const status = err.statusCode && err.statusCode < 500 ? err.statusCode : 500;
    if (status === 500) app.log.error(err);
    return reply.code(status).send({ error: status === 500 ? "Internal server error" : err.message });
  });

  app.setNotFoundHandler((_req, reply) => reply.code(404).send({ error: "Not found" }));

  if (opts.delayMs > 0) {
    app.addHook("onRequest", async (req) => {
      if (req.url.startsWith("/api/tasks")) await sleep(opts.delayMs);
    });
  }

  app.get("/api/health", async () => ({ ok: true }));

  app.get<{ Querystring: { status?: TaskStatus } }>(
    "/api/tasks",
    { schema: { querystring: listQuery } },
    async (req) => store.list(req.query.status),
  );

  app.get<{ Params: { id: string } }>("/api/tasks/:id", async (req, reply) => {
    const task = store.get(req.params.id);
    return task ?? reply.code(404).send({ error: MESSAGES.notFound });
  });

  app.post<{ Body: NewTask }>("/api/tasks", { schema: { body: createBody } }, async (req, reply) => {
    return reply.code(201).send(store.create(req.body));
  });

  app.patch<{ Params: { id: string }; Body: TaskPatch }>(
    "/api/tasks/:id",
    { schema: { body: patchBody } },
    async (req, reply) => {
      const task = store.update(req.params.id, req.body);
      return task ?? reply.code(404).send({ error: MESSAGES.notFound });
    },
  );

  app.delete<{ Params: { id: string } }>("/api/tasks/:id", async (req, reply) => {
    return store.remove(req.params.id)
      ? reply.code(204).send()
      : reply.code(404).send({ error: MESSAGES.notFound });
  });

  // Test-only escape hatch so every e2e test starts from the same data.
  if (opts.enableReset) {
    app.post("/api/reset", async (_req, reply) => {
      store.reset();
      return reply.code(204).send();
    });
  }
}
