import {
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

export const users = sqliteTable(
  "users",
  {
    id: text("id").primaryKey(),
    clerkUserId: text("clerk_user_id").notNull(),
    email: text("email").notNull(),
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
    deletedAt: integer("deleted_at"),
  },
  (table) => [
    uniqueIndex("users_clerk_user_id_uq").on(table.clerkUserId),
    index("users_email_idx").on(table.email),
  ],
);

export const breeds = sqliteTable(
  "breeds",
  {
    id: text("id").primaryKey(),
    nameJa: text("name_ja").notNull(),
    nameEn: text("name_en"),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (table) => [index("breeds_name_ja_idx").on(table.nameJa)],
);

export const cats = sqliteTable(
  "cats",
  {
    id: text("id").primaryKey(),
    ownerUserId: text("owner_user_id")
      .notNull()
      .references(() => users.id),
    name: text("name").notNull(),
    iconImageKey: text("icon_image_key"),
    sex: text("sex").notNull(),
    birthday: text("birthday"),
    breedId: text("breed_id").references(() => breeds.id),
    coatColor: text("coat_color"),
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
    deletedAt: integer("deleted_at"),
  },
  (table) => [
    index("cats_owner_idx").on(table.ownerUserId),
    index("cats_name_idx").on(table.name),
    index("cats_breed_idx").on(table.breedId),
  ],
);

export const posts = sqliteTable(
  "posts",
  {
    id: text("id").primaryKey(),
    authorCatId: text("author_cat_id")
      .notNull()
      .references(() => cats.id),
    type: text("type").notNull(),
    body: text("body"),
    status: text("status").notNull().default("draft"),
    publishedAt: integer("published_at"),
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
    deletedAt: integer("deleted_at"),
  },
  (table) => [
    index("posts_author_published_idx").on(
      table.authorCatId,
      table.publishedAt,
    ),
    index("posts_status_published_idx").on(table.status, table.publishedAt),
  ],
);

export const postImages = sqliteTable(
  "post_images",
  {
    id: text("id").primaryKey(),
    postId: text("post_id")
      .notNull()
      .references(() => posts.id),
    r2Key: text("r2_key").notNull(),
    sortOrder: integer("sort_order").notNull(),
    width: integer("width"),
    height: integer("height"),
    mimeType: text("mime_type"),
    sizeBytes: integer("size_bytes"),
    moderationStatus: text("moderation_status").notNull().default("pending"),
    moderationReason: text("moderation_reason"),
    createdAt: integer("created_at").notNull(),
  },
  (table) => [
    index("post_images_post_idx").on(table.postId),
    uniqueIndex("post_images_post_sort_uq").on(table.postId, table.sortOrder),
  ],
);

export const postVideos = sqliteTable(
  "post_videos",
  {
    id: text("id").primaryKey(),
    postId: text("post_id")
      .notNull()
      .references(() => posts.id),
    streamUid: text("stream_uid").notNull(),
    durationSeconds: integer("duration_seconds"),
    width: integer("width"),
    height: integer("height"),
    moderationStatus: text("moderation_status").notNull().default("pending"),
    createdAt: integer("created_at").notNull(),
  },
  (table) => [
    uniqueIndex("post_videos_post_uq").on(table.postId),
    uniqueIndex("post_videos_stream_uid_uq").on(table.streamUid),
  ],
);

export const postCatTags = sqliteTable(
  "post_cat_tags",
  {
    postId: text("post_id")
      .notNull()
      .references(() => posts.id),
    catId: text("cat_id")
      .notNull()
      .references(() => cats.id),
    createdAt: integer("created_at").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.postId, table.catId] }),
    index("post_cat_tags_cat_idx").on(table.catId),
  ],
);

export const hashtags = sqliteTable(
  "hashtags",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    createdAt: integer("created_at").notNull(),
  },
  (table) => [uniqueIndex("hashtags_name_uq").on(table.name)],
);

export const postHashtags = sqliteTable(
  "post_hashtags",
  {
    postId: text("post_id")
      .notNull()
      .references(() => posts.id),
    hashtagId: text("hashtag_id")
      .notNull()
      .references(() => hashtags.id),
  },
  (table) => [
    primaryKey({ columns: [table.postId, table.hashtagId] }),
    index("post_hashtags_hashtag_idx").on(table.hashtagId),
  ],
);

export const follows = sqliteTable(
  "follows",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    catId: text("cat_id")
      .notNull()
      .references(() => cats.id),
    createdAt: integer("created_at").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.catId] }),
    index("follows_cat_idx").on(table.catId),
  ],
);

export const likes = sqliteTable(
  "likes",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    postId: text("post_id")
      .notNull()
      .references(() => posts.id),
    createdAt: integer("created_at").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.postId] }),
    index("likes_post_idx").on(table.postId),
  ],
);

export const comments = sqliteTable(
  "comments",
  {
    id: text("id").primaryKey(),
    postId: text("post_id")
      .notNull()
      .references(() => posts.id),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    parentCommentId: text("parent_comment_id"),
    body: text("body").notNull(),
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
    deletedAt: integer("deleted_at"),
  },
  (table) => [
    index("comments_post_created_idx").on(table.postId, table.createdAt),
    index("comments_parent_idx").on(table.parentCommentId),
  ],
);

export const bookmarks = sqliteTable(
  "bookmarks",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    postId: text("post_id")
      .notNull()
      .references(() => posts.id),
    createdAt: integer("created_at").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.postId] }),
    index("bookmarks_user_created_idx").on(table.userId, table.createdAt),
  ],
);

export const notifications = sqliteTable(
  "notifications",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    type: text("type").notNull(),
    actorUserId: text("actor_user_id").references(() => users.id),
    catId: text("cat_id").references(() => cats.id),
    postId: text("post_id").references(() => posts.id),
    commentId: text("comment_id").references(() => comments.id),
    readAt: integer("read_at"),
    createdAt: integer("created_at").notNull(),
  },
  (table) => [
    index("notifications_user_created_idx").on(table.userId, table.createdAt),
    index("notifications_user_read_idx").on(table.userId, table.readAt),
  ],
);

export const blocks = sqliteTable(
  "blocks",
  {
    blockerUserId: text("blocker_user_id")
      .notNull()
      .references(() => users.id),
    blockedUserId: text("blocked_user_id")
      .notNull()
      .references(() => users.id),
    createdAt: integer("created_at").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.blockerUserId, table.blockedUserId] }),
  ],
);

export const catMutes = sqliteTable(
  "cat_mutes",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    catId: text("cat_id")
      .notNull()
      .references(() => cats.id),
    createdAt: integer("created_at").notNull(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.catId] })],
);

export const reports = sqliteTable(
  "reports",
  {
    id: text("id").primaryKey(),
    reporterUserId: text("reporter_user_id")
      .notNull()
      .references(() => users.id),
    targetType: text("target_type").notNull(),
    targetId: text("target_id").notNull(),
    reason: text("reason").notNull(),
    detail: text("detail"),
    status: text("status").notNull().default("pending"),
    createdAt: integer("created_at").notNull(),
    resolvedAt: integer("resolved_at"),
  },
  (table) => [
    index("reports_target_idx").on(table.targetType, table.targetId),
    index("reports_status_idx").on(table.status, table.createdAt),
  ],
);

export const mediaSessions = sqliteTable(
  "media_sessions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    type: text("type").notNull(),
    status: text("status").notNull().default("pending"),
    createdAt: integer("created_at").notNull(),
    expiresAt: integer("expires_at").notNull(),
  },
  (table) => [
    index("media_sessions_user_idx").on(table.userId),
    index("media_sessions_expires_idx").on(table.expiresAt),
  ],
);

export const moderationResults = sqliteTable(
  "moderation_results",
  {
    id: text("id").primaryKey(),
    mediaSessionId: text("media_session_id").references(() => mediaSessions.id),
    postId: text("post_id").references(() => posts.id),
    mediaType: text("media_type").notNull(),
    mediaId: text("media_id"),
    frameTimestampMs: integer("frame_timestamp_ms"),
    stage: text("stage").notNull(),
    result: text("result").notNull(),
    reason: text("reason"),
    scoresJson: text("scores_json"),
    model: text("model"),
    createdAt: integer("created_at").notNull(),
  },
  (table) => [
    index("moderation_results_session_idx").on(table.mediaSessionId),
    index("moderation_results_post_idx").on(table.postId),
  ],
);
