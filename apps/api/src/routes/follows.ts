import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import { createDb } from "../db/client";
import { cats, follows } from "../db/schema";
import { nowUnix } from "../lib/time";
import { requireAuth } from "../middleware/auth";
import type { AppEnv } from "../types";

export const followRoutes = new Hono<AppEnv>();

followRoutes.use("*", requireAuth);

followRoutes.post("/:catId/follow", async (c) => {
  const db = createDb(c.env.DB);
  const userId = c.get("userId");
  const catId = c.req.param("catId");

  const [cat] = await db
    .select({ id: cats.id })
    .from(cats)
    .where(eq(cats.id, catId))
    .limit(1);

  if (!cat) {
    return c.json(
      { error: { code: "NOT_FOUND", message: "Cat not found" } },
      404,
    );
  }

  await db
    .insert(follows)
    .values({ userId, catId, createdAt: nowUnix() })
    .onConflictDoNothing();

  return c.json({ data: { following: true } });
});

followRoutes.delete("/:catId/follow", async (c) => {
  const db = createDb(c.env.DB);
  const userId = c.get("userId");
  const catId = c.req.param("catId");

  await db
    .delete(follows)
    .where(and(eq(follows.userId, userId), eq(follows.catId, catId)));

  return c.json({ data: { following: false } });
});
