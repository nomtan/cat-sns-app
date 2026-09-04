import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import { createDb } from "../db/client";
import { mediaSessionItems } from "../db/media-schema";
import { mediaSessions, moderationResults } from "../db/schema";
import { createId } from "../lib/id";
import { nowUnix } from "../lib/time";
import { requireAuth } from "../middleware/auth";
import { LocalMediaStorage } from "../services/media/storage";
import { MockModerationService } from "../services/moderation/mock";
import type { ModerationDecision } from "../services/moderation/types";
import type { AppEnv } from "../types";

export const mediaRoutes = new Hono<AppEnv>();
mediaRoutes.use("*", requireAuth);

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

  const db = createDb(c.env.DB);
  const userId = c.get("userId");
  const id = createId();
  const now = nowUnix();
  const storage = new LocalMediaStorage();
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
    const target = await storage.createUploadTarget({
      userId,
      mediaSessionId: id,
      itemId,
      mimeType: body.mimeTypes?.[i],
    });

    await db.insert(mediaSessionItems).values({
      id: itemId,
      mediaSessionId: id,
      sortOrder: i,
      storageKey: target.key,
      mimeType: body.mimeTypes?.[i] ?? null,
      status: "pending",
      createdAt: now,
      updatedAt: now,
    });

    items.push({ id: itemId, ...target });
  }

  return c.json({ data: { mediaSessionId: id, items } }, 201);
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
    sizeBytes: body.sizeBytes ?? null,
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
