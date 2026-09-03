import { and, count, desc, eq, isNull } from "drizzle-orm";
import { Hono } from "hono";
import { createDb } from "../db/client";
import { breeds, cats, follows, posts, users } from "../db/schema";
import { createId } from "../lib/id";
import { nowUnix } from "../lib/time";
import { requireAuth } from "../middleware/auth";
import type { AppEnv } from "../types";

type CatInput = {
  name?: unknown;
  iconImageKey?: unknown;
  sex?: unknown;
  birthday?: unknown;
  breedId?: unknown;
  coatColor?: unknown;
};

const parseCatInput = (input: CatInput) => {
  const name = typeof input.name === "string" ? input.name.trim() : "";
  const sex = typeof input.sex === "string" ? input.sex : "";

  if (!name || name.length > 50) {
    return { error: "name must be 1-50 characters" } as const;
  }

  if (!["male", "female", "unknown"].includes(sex)) {
    return { error: "sex must be male, female, or unknown" } as const;
  }

  return {
    data: {
      name,
      sex,
      iconImageKey:
        typeof input.iconImageKey === "string" ? input.iconImageKey : null,
      birthday: typeof input.birthday === "string" ? input.birthday : null,
      breedId: typeof input.breedId === "string" ? input.breedId : null,
      coatColor:
        typeof input.coatColor === "string" ? input.coatColor.trim() : null,
    },
  } as const;
};


export const catRoutes = new Hono<AppEnv>();

catRoutes.get("/:catId", async (c) => {
  const db = createDb(c.env.DB);
  const catId = c.req.param("catId");

  const [row] = await db
    .select({
      id: cats.id,
      name: cats.name,
      iconImageKey: cats.iconImageKey,
      sex: cats.sex,
      birthday: cats.birthday,
      coatColor: cats.coatColor,
      breedId: breeds.id,
      breedNameJa: breeds.nameJa,
      breedNameEn: breeds.nameEn,
    })
    .from(cats)
    .leftJoin(breeds, eq(cats.breedId, breeds.id))
    .where(and(eq(cats.id, catId), isNull(cats.deletedAt)))
    .limit(1);

  if (!row) {
    return c.json(
      { error: { code: "NOT_FOUND", message: "Cat not found" } },
      404,
    );
  }

  const [[followers], [postCount]] = await Promise.all([
    db.select({ count: count() }).from(follows).where(eq(follows.catId, catId)),
    db
      .select({ count: count() })
      .from(posts)
      .where(
        and(
          eq(posts.authorCatId, catId),
          eq(posts.status, "published"),
          isNull(posts.deletedAt),
        ),
      ),
  ]);

  return c.json({
    data: {
      id: row.id,
      name: row.name,
      iconImageKey: row.iconImageKey,
      sex: row.sex,
      birthday: row.birthday,
      coatColor: row.coatColor,
      breed: row.breedId
        ? {
            id: row.breedId,
            nameJa: row.breedNameJa,
            nameEn: row.breedNameEn,
          }
        : null,
      followersCount: followers?.count ?? 0,
      postsCount: postCount?.count ?? 0,
    },
  });
});

catRoutes.get("/:catId/posts", async (c) => {
  const db = createDb(c.env.DB);
  const catId = c.req.param("catId");
  const limit = Math.min(Math.max(Number(c.req.query("limit") ?? 20), 1), 50);

  const rows = await db
    .select({
      id: posts.id,
      type: posts.type,
      body: posts.body,
      publishedAt: posts.publishedAt,
    })
    .from(posts)
    .where(
      and(
        eq(posts.authorCatId, catId),
        eq(posts.status, "published"),
        isNull(posts.deletedAt),
      ),
    )
    .orderBy(desc(posts.publishedAt))
    .limit(limit);

  return c.json({ data: rows, nextCursor: null });
});

catRoutes.use("*", requireAuth);

catRoutes.post("/", async (c) => {
  const db = createDb(c.env.DB);
  const userId = c.get("userId");
  const parsed = parseCatInput(await c.req.json<CatInput>());

  if ("error" in parsed) {
    return c.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: parsed.error,
        },
      },
      400,
    );
  }

  const [owner] = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.id, userId), isNull(users.deletedAt)))
    .limit(1);

  if (!owner) {
    return c.json(
      {
        error: {
          code: "UNAUTHORIZED",
          message: "Authenticated user is not registered",
        },
      },
      401,
    );
  }

  const timestamp = nowUnix();
  const id = createId();

  await db.insert(cats).values({
    id,
    ownerUserId: userId,
    ...parsed.data,
    createdAt: timestamp,
    updatedAt: timestamp,
  });

  return c.json({ data: { id } }, 201);
});

catRoutes.patch("/:catId", async (c) => {
  const db = createDb(c.env.DB);
  const userId = c.get("userId");
  const catId = c.req.param("catId");
  const parsed = parseCatInput(await c.req.json<CatInput>());

  if ("error" in parsed) {
    return c.json(
      { error: { code: "VALIDATION_ERROR", message: parsed.error } },
      400,
    );
  }

  const [owned] = await db
    .select({ id: cats.id })
    .from(cats)
    .where(
      and(
        eq(cats.id, catId),
        eq(cats.ownerUserId, userId),
        isNull(cats.deletedAt),
      ),
    )
    .limit(1);

  if (!owned) {
    return c.json(
      { error: { code: "NOT_FOUND", message: "Cat not found" } },
      404,
    );
  }

  await db
    .update(cats)
    .set({ ...parsed.data, updatedAt: nowUnix() })
    .where(eq(cats.id, catId));

  return c.json({ data: { id: catId } });
});

catRoutes.delete("/:catId", async (c) => {
  const db = createDb(c.env.DB);
  const userId = c.get("userId");
  const catId = c.req.param("catId");

  const result = await db
    .update(cats)
    .set({ deletedAt: nowUnix(), updatedAt: nowUnix() })
    .where(
      and(
        eq(cats.id, catId),
        eq(cats.ownerUserId, userId),
        isNull(cats.deletedAt),
      ),
    );

  if (!result.meta.changes) {
    return c.json(
      { error: { code: "NOT_FOUND", message: "Cat not found" } },
      404,
    );
  }

  return c.body(null, 204);
});
