import { Hono } from "hono";

export const healthRoutes = new Hono<{ Bindings: Env }>();

healthRoutes.get("/", (c) =>
  c.json({
    data: {
      status: "ok",
      service: "cat-sns-api",
    },
  }),
);
