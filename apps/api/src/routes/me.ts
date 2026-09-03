import { and, asc, eq, isNull } from "drizzle-orm";
import { Hono } from "hono";
import { createDb } from "../db/client";
import { breeds, cats } from "../db/schema";
import { requireAuth } from "../middleware/auth";
import type { AppEnv } from "../types";

export const meRoutes = new Hono<AppEnv>();

meRoutes.use("*", requireAuth);

meRoutes.get("/cats", async (c) => {
  const db = createDb(c.env.DB);
  const userId = c.get("userId");

  const rows = await db
    .select({
      id: cats.id,
      name: cats.name,
      iconImageKey: cats.iconImageKey,
      sex: cats.sex,
      birthday: cats.birthday,
      coatColor: cats.coatColor,
      breedId: breeds.id,
      breedNameJa: breeds.nameJa,
    })
    .from(cats)
    .leftJoin(breeds, eq(cats.breedId, breeds.id))
    .where(and(eq(cats.ownerUserId, userId), isNull(cats.deletedAt)))
    .orderBy(asc(cats.createdAt));

  return c.json({ data: rows });
});
