import { asc } from "drizzle-orm";
import { Hono } from "hono";
import { createDb } from "../db/client";
import { breeds } from "../db/schema";
import type { AppEnv } from "../types";

export const breedRoutes = new Hono<AppEnv>();

breedRoutes.get("/", async (c) => {
  const db = createDb(c.env.DB);
  const rows = await db
    .select({
      id: breeds.id,
      nameJa: breeds.nameJa,
      nameEn: breeds.nameEn,
    })
    .from(breeds)
    .orderBy(asc(breeds.sortOrder), asc(breeds.nameJa));

  return c.json({ data: rows });
});
