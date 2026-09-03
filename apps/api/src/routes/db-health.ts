import { sql } from "drizzle-orm";
import { Hono } from "hono";
import { createDb } from "../db/client";
import type { AppEnv } from "../types";

export const dbHealthRoutes = new Hono<AppEnv>();

dbHealthRoutes.get("/", async (c) => {
  const db = createDb(c.env.DB);
  await db.run(sql`select 1`);

  return c.json({
    data: {
      status: "ok",
      database: "d1",
    },
  });
});
