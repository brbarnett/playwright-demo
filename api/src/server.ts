import { buildApp } from "./app.ts";

const port = Number(process.env.PORT ?? 8000);

const app = buildApp({
  logger: true,
  delayMs: Number(process.env.API_DELAY_MS ?? 0),
  enableReset: process.env.NODE_ENV !== "production",
});

await app.listen({ port, host: "127.0.0.1" });
