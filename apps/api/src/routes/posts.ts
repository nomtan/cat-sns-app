import { and, eq, isNull } from "drizzle-orm";
import { Hono } from "hono";
import { createDb } from "../db/client";
import { mediaSessionItems } from "../db/media-schema";
import { cats, hashtags, mediaSessions, postCatTags, postHashtags, postImages, postVideos, posts } from "../db/schema";
import { createId } from "../lib/id";
import { nowUnix } from "../lib/time";
import { requireAuth } from "../middleware/auth";
import type { AppEnv } from "../types";

export const postRoutes = new Hono<AppEnv>();

postRoutes.get("/:postId", async (c) => {
  const db = createDb(c.env.DB);
  const postId = c.req.param("postId");
  const [post] = await db.select().from(posts).where(and(eq(posts.id, postId), eq(posts.status, "published"), isNull(posts.deletedAt))).limit(1);
  if (!post) return c.json({ error: { code: "NOT_FOUND", message: "Post not found" } }, 404);

  const images = post.type === "image" ? await db.select().from(postImages).where(eq(postImages.postId, postId)) : [];
  const videos = post.type === "video" ? await db.select().from(postVideos).where(eq(postVideos.postId, postId)) : [];
  return c.json({ data: { ...post, images, videos } });
});

postRoutes.use("*", requireAuth);

postRoutes.post("/", async (c) => {
  const db = createDb(c.env.DB);
  const userId = c.get("userId");
  const body = await c.req.json<{
    authorCatId?: string;
    mediaSessionId?: string;
    body?: string;
    hashtagNames?: string[];
    taggedCatIds?: string[];
  }>();

  if (!body.authorCatId || !body.mediaSessionId) {
    return c.json({ error: { code: "VALIDATION_ERROR", message: "authorCatId and mediaSessionId are required" } }, 400);
  }

  const [cat] = await db.select({ id: cats.id }).from(cats).where(and(eq(cats.id, body.authorCatId), eq(cats.ownerUserId, userId), isNull(cats.deletedAt))).limit(1);
  if (!cat) return c.json({ error: { code: "FORBIDDEN", message: "You do not manage this cat" } }, 403);

  const [session] = await db.select().from(mediaSessions).where(and(eq(mediaSessions.id, body.mediaSessionId), eq(mediaSessions.userId, userId))).limit(1);
  if (!session) return c.json({ error: { code: "MEDIA_NOT_READY", message: "Media session not found" } }, 400);
  if (session.status === "reject") return c.json({ error: { code: "MEDIA_REJECTED", message: "Media was rejected" } }, 400);
  if (session.status !== "allow") return c.json({ error: { code: "MODERATION_PENDING", message: "Media moderation is not complete" } }, 409);

  const items = await db.select().from(mediaSessionItems).where(eq(mediaSessionItems.mediaSessionId, session.id));
  if (!items.length || items.some((item) => item.moderationDecision !== "ALLOW")) {
    return c.json({ error: { code: "MODERATION_PENDING", message: "All media items must be allowed" } }, 409);
  }

  const now = nowUnix();
  const postId = createId();
  await db.insert(posts).values({
    id: postId,
    authorCatId: body.authorCatId,
    type: session.type,
    body: typeof body.body === "string" ? body.body.trim().slice(0, 2000) : null,
    status: "published",
    publishedAt: now,
    createdAt: now,
    updatedAt: now,
  });

  if (session.type === "image") {
    await db.insert(postImages).values(items.map((item) => ({
      id: createId(),
      postId,
      r2Key: item.storageKey,
      sortOrder: item.sortOrder,
      width: item.width,
      height: item.height,
      mimeType: item.mimeType,
      sizeBytes: item.sizeBytes,
      moderationStatus: "ALLOW",
      moderationReason: item.moderationReason,
      createdAt: now,
    })));
  } else {
    const item = items[0];
    await db.insert(postVideos).values({
      id: createId(),
      postId,
      streamUid: `local:${item.storageKey}`,
      durationSeconds: item.durationSeconds,
      width: item.width,
      height: item.height,
      moderationStatus: "ALLOW",
      createdAt: now,
    });
  }

  for (const rawName of body.hashtagNames ?? []) {
    const name = rawName.trim().replace(/^#/, "").toLowerCase();
    if (!name) continue;
    let [tag] = await db.select({ id: hashtags.id }).from(hashtags).where(eq(hashtags.name, name)).limit(1);
    if (!tag) {
      const id = createId();
      await db.insert(hashtags).values({ id, name, createdAt: now }).onConflictDoNothing();
      tag = { id };
    }
    await db.insert(postHashtags).values({ postId, hashtagId: tag.id }).onConflictDoNothing();
  }

  for (const catId of body.taggedCatIds ?? []) {
    await db.insert(postCatTags).values({ postId, catId, createdAt: now }).onConflictDoNothing();
  }

  return c.json({ data: { id: postId, status: "published" } }, 201);
});

postRoutes.delete("/:postId", async (c) => {
  const db = createDb(c.env.DB);
  const userId = c.get("userId");
  const postId = c.req.param("postId");
  const [owned] = await db.select({ id: posts.id }).from(posts).innerJoin(cats, eq(posts.authorCatId, cats.id)).where(and(eq(posts.id, postId), eq(cats.ownerUserId, userId), isNull(posts.deletedAt))).limit(1);
  if (!owned) return c.json({ error: { code: "NOT_FOUND", message: "Post not found" } }, 404);
  await db.update(posts).set({ status: "deleted", deletedAt: nowUnix(), updatedAt: nowUnix() }).where(eq(posts.id, postId));
  return c.body(null, 204);
});
