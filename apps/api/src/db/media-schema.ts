import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { mediaSessions } from "./schema";

export const mediaSessionItems = sqliteTable(
  "media_session_items",
  {
    id: text("id").primaryKey(),
    mediaSessionId: text("media_session_id")
      .notNull()
      .references(() => mediaSessions.id),
    sortOrder: integer("sort_order").notNull(),
    storageKey: text("storage_key").notNull(),
    mimeType: text("mime_type"),
    width: integer("width"),
    height: integer("height"),
    sizeBytes: integer("size_bytes"),
    durationSeconds: integer("duration_seconds"),
    status: text("status").notNull().default("pending"),
    moderationDecision: text("moderation_decision"),
    moderationReason: text("moderation_reason"),
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
  },
  (table) => [
    index("media_session_items_session_idx").on(table.mediaSessionId),
    uniqueIndex("media_session_items_order_uq").on(
      table.mediaSessionId,
      table.sortOrder,
    ),
  ],
);
