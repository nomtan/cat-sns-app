import { Hono } from "hono";
import { sql } from "drizzle-orm";
import { createDb } from "../db/client";

export const dbHealthRoutes = new Hono<{ Bindings: Env }>();

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
