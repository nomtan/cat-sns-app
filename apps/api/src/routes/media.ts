import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import { createDb } from "../db/client";
import { mediaSessionItems } from "../db/media-schema";
import { mediaSessions, moderationResults } from "../db/schema";
import { createId } from "../lib/id";
import { nowUnix } from "../lib/time";
import { requireAuth } from "../middleware/auth";
import { R2MediaStorage } from "../services/media/storage";
import { MockModerationService } from "../services/moderation/mock";
import type { ModerationDecision } from "../services/moderation/types";
import type { AppEnv } from "../types";

export const mediaRoutes = new Hono<AppEnv>();
mediaRoutes.use("*", requireAuth);

const allowedImageMimeTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);
const allowedVideoMimeTypes = new Set(["video/mp4", "video/quicktime"]);
const maxImageBytes = 15 * 1024 * 1024;
const maxVideoBytes = 200 * 1024 * 1024;

mediaRoutes.post("/sessions", async (c) => {
  const body = await c.req.json<{ type?: string; count?: number; mimeTypes?: string[] }>();
  const type = body.type;
  const count = Number(body.count ?? 0);

  if (type !== "image" && type !== "video") {
    return c.json({ error: { code: "INVALID_MEDIA_TYPE", message: "type must be image or video" } }, 400);
  }

  if ((type === "image" && (count < 1 || count > 4)) || (type === "video" && count !== 1)) {
    return c.json({ error: { code: "VALIDATION_ERROR", message: type === "image" ? "image count must be 1-4" : "video count must be 1" } }, 400);
  }

  const mimeTypes = body.mimeTypes ?? [];
  if (mimeTypes.length !== count) {
    return c.json({ error: { code: "VALIDATION_ERROR", message: "mimeTypes must match media count" } }, 400);
  }

  const allowedMimeTypes = type === "image" ? allowedImageMimeTypes : allowedVideoMimeTypes;
  if (mimeTypes.some((mimeType) => !allowedMimeTypes.has(mimeType))) {
    return c.json({ error: { code: "UNSUPPORTED_MEDIA_TYPE", message: "Unsupported media MIME type" } }, 400);
  }

  const db = createDb(c.env.DB);
  const userId = c.get("userId");
  const id = createId();
  const now = nowUnix();
  const storage = new R2MediaStorage(c.env.MEDIA_BUCKET);
  const items = [];

  await db.insert(mediaSessions).values({
    id,
    userId,
    type,
    status: "uploading",
    createdAt: now,
    expiresAt: now + 60 * 60,
  });

  for (let i = 0; i < count; i += 1) {
    const itemId = createId();
    const mimeType = mimeTypes[i];
    const key = storage.createKey({
      userId,
      mediaSessionId: id,
      itemId,
      mimeType,
    });
    const uploadUrl = `${new URL(c.req.url).origin}/api/v1/media/sessions/${id}/items/${itemId}/upload`;

    await db.insert(mediaSessionItems).values({
      id: itemId,
      mediaSessionId: id,
      sortOrder: i,
      storageKey: key,
      mimeType,
      status: "pending",
      createdAt: now,
      updatedAt: now,
    });

    items.push({ id: itemId, key, method: "PUT" as const, uploadUrl });
  }

  return c.json({ data: { mediaSessionId: id, items } }, 201);
});

mediaRoutes.put("/sessions/:sessionId/items/:itemId/upload", async (c) => {
  const db = createDb(c.env.DB);
  const userId = c.get("userId");
  const sessionId = c.req.param("sessionId");
  const itemId = c.req.param("itemId");

  const [session] = await db.select().from(mediaSessions).where(and(eq(mediaSessions.id, sessionId), eq(mediaSessions.userId, userId))).limit(1);
  if (!session) return c.json({ error: { code: "NOT_FOUND", message: "Media session not found" } }, 404);

  if (session.expiresAt <= nowUnix()) {
    return c.json({ error: { code: "MEDIA_SESSION_EXPIRED", message: "Media session has expired" } }, 410);
  }

  const [item] = await db.select().from(mediaSessionItems).where(and(eq(mediaSessionItems.id, itemId), eq(mediaSessionItems.mediaSessionId, sessionId))).limit(1);
  if (!item) return c.json({ error: { code: "NOT_FOUND", message: "Media item not found" } }, 404);

  const contentType = c.req.header("content-type")?.split(";")[0]?.trim();
  if (!contentType || contentType !== item.mimeType) {
    return c.json({ error: { code: "INVALID_CONTENT_TYPE", message: "Content-Type must match the media session item" } }, 400);
  }

  const contentLength = Number(c.req.header("content-length") ?? 0);
  const maxBytes = session.type === "image" ? maxImageBytes : maxVideoBytes;
  if (contentLength > maxBytes) {
    return c.json({ error: { code: "MEDIA_TOO_LARGE", message: "Media file is too large" } }, 413);
  }

  const body = c.req.raw.body;
  if (!body) {
    return c.json({ error: { code: "EMPTY_UPLOAD", message: "Upload body is required" } }, 400);
  }

  const storage = new R2MediaStorage(c.env.MEDIA_BUCKET);
  await storage.put({ key: item.storageKey, body, contentType });

  await db.update(mediaSessionItems).set({
    status: "uploaded",
    sizeBytes: contentLength > 0 ? contentLength : null,
    updatedAt: nowUnix(),
  }).where(eq(mediaSessionItems.id, itemId));

  return c.json({ data: { itemId, uploaded: true } });
});

mediaRoutes.post("/sessions/:sessionId/items/:itemId/complete", async (c) => {
  const db = createDb(c.env.DB);
  const userId = c.get("userId");
  const sessionId = c.req.param("sessionId");
  const itemId = c.req.param("itemId");
  const body = await c.req.json<{
    width?: number;
    height?: number;
    sizeBytes?: number;
    durationSeconds?: number;
    clientDecision?: ModerationDecision;
    clientScores?: Record<string, number>;
    reason?: string;
  }>();

  const [session] = await db.select().from(mediaSessions).where(and(eq(mediaSessions.id, sessionId), eq(mediaSessions.userId, userId))).limit(1);
  if (!session) return c.json({ error: { code: "NOT_FOUND", message: "Media session not found" } }, 404);

  const [item] = await db.select().from(mediaSessionItems).where(and(eq(mediaSessionItems.id, itemId), eq(mediaSessionItems.mediaSessionId, sessionId))).limit(1);
  if (!item) return c.json({ error: { code: "NOT_FOUND", message: "Media item not found" } }, 404);

  const storage = new R2MediaStorage(c.env.MEDIA_BUCKET);
  if (!(await storage.exists(item.storageKey))) {
    return c.json({ error: { code: "MEDIA_NOT_UPLOADED", message: "Media must be uploaded before completion" } }, 409);
  }

  if (session.type === "video" && Number(body.durationSeconds ?? 0) > 30) {
    return c.json({ error: { code: "VIDEO_TOO_LONG", message: "Video must be 30 seconds or shorter" } }, 400);
  }

  const clientDecision = body.clientDecision;
  if (!clientDecision || !["ALLOW", "REJECT", "REVIEW"].includes(clientDecision)) {
    return c.json({ error: { code: "VALIDATION_ERROR", message: "clientDecision is required" } }, 400);
  }

  const moderation = new MockModerationService();
  const result = await moderation.moderate({
    mediaType: session.type === "image" ? "image" : "video_frame",
    mediaId: itemId,
    clientDecision,
    clientScores: body.clientScores,
    reason: body.reason,
  });
  const now = nowUnix();

  await db.update(mediaSessionItems).set({
    width: body.width ?? null,
    height: body.height ?? null,
    sizeBytes: body.sizeBytes ?? item.sizeBytes,
    durationSeconds: body.durationSeconds ?? null,
    status: result.decision === "ALLOW" ? "allow" : "reject",
    moderationDecision: result.decision,
    moderationReason: result.reason ?? null,
    updatedAt: now,
  }).where(eq(mediaSessionItems.id, itemId));

  await db.insert(moderationResults).values({
    id: createId(),
    mediaSessionId: sessionId,
    mediaType: session.type === "image" ? "image" : "video_frame",
    mediaId: itemId,
    stage: result.stage,
    result: result.decision,
    reason: result.reason ?? null,
    scoresJson: body.clientScores ? JSON.stringify(body.clientScores) : null,
    model: result.stage === "mock-review" ? "local-mock" : "client",
    createdAt: now,
  });

  const allItems = await db.select({ status: mediaSessionItems.status }).from(mediaSessionItems).where(eq(mediaSessionItems.mediaSessionId, sessionId));
  const status = allItems.some((entry) => entry.status === "reject")
    ? "reject"
    : allItems.every((entry) => entry.status === "allow")
      ? "allow"
      : "processing";

  await db.update(mediaSessions).set({ status }).where(eq(mediaSessions.id, sessionId));

  return c.json({ data: { itemId, decision: result.decision, sessionStatus: status } });
});

mediaRoutes.get("/sessions/:sessionId", async (c) => {
  const db = createDb(c.env.DB);
  const userId = c.get("userId");
  const sessionId = c.req.param("sessionId");
  const [session] = await db.select().from(mediaSessions).where(and(eq(mediaSessions.id, sessionId), eq(mediaSessions.userId, userId))).limit(1);
  if (!session) return c.json({ error: { code: "NOT_FOUND", message: "Media session not found" } }, 404);

  const items = await db.select().from(mediaSessionItems).where(eq(mediaSessionItems.mediaSessionId, sessionId));
  return c.json({ data: { ...session, items } });
});
