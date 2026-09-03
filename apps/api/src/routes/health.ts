import { Hono } from "hono";
import type { AppEnv } from "../types";

export const healthRoutes = new Hono<AppEnv>();

healthRoutes.get("/", (c) =>
  c.json({
    data: {
      status: "ok",
      service: "cat-sns-api",
    },
  }),
);
