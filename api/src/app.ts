import Fastify, { type FastifyInstance } from "fastify";
import { createStore } from "./store.ts";
import { registerRoutes } from "./routes.ts";

export type AppOptions = {
  logger?: boolean;
  delayMs?: number;
  enableReset?: boolean;
};

export function buildApp(opts: AppOptions = {}): FastifyInstance {
  const app = Fastify({ logger: opts.logger ?? false });
  registerRoutes(app, createStore(), {
    delayMs: opts.delayMs ?? 0,
    enableReset: opts.enableReset ?? true,
  });
  return app;
}
