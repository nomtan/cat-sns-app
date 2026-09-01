# Cat SNS App Drizzle Schema設計

最終更新: 2026-09-02
ステータス: Draft
対象: Cloudflare D1 / Drizzle ORM

## 1. 基本方針

- SQLite / D1
- 文字列ID
- createdAt / updatedAtはUNIX timestamp integer
- 論理削除対象はdeletedAtを持つ
- 公開ユーザー情報は持たない
- ownerUserIdは内部管理専用

## 2. 推奨ID

MVPではUUID v7またはULIDを推奨。

理由:
- クライアント / Worker側で生成可能
- 時系列性を持たせやすい
- 連番IDを外部公開しない

## 3. schema.ts たたき台

```ts
import {
  sqliteTable,
  text,
  integer,
  primaryKey,
  uniqueIndex,
  index,
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
  (t) => ({
    clerkUserIdUq: uniqueIndex("users_clerk_user_id_uq").on(t.clerkUserId),
    emailIdx: index("users_email_idx").on(t.email),
  }),
);

export const breeds = sqliteTable(
  "breeds",
  {
    id: text("id").primaryKey(),
    nameJa: text("name_ja").notNull(),
    nameEn: text("name_en"),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => ({
    nameJaIdx: index("breeds_name_ja_idx").on(t.nameJa),
  }),
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
  (t) => ({
    ownerIdx: index("cats_owner_idx").on(t.ownerUserId),
    nameIdx: index("cats_name_idx").on(t.name),
    breedIdx: index("cats_breed_idx").on(t.breedId),
  }),
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
  (t) => ({
    authorPublishedIdx: index("posts_author_published_idx").on(
      t.authorCatId,
      t.publishedAt,
    ),
    statusPublishedIdx: index("posts_status_published_idx").on(
      t.status,
      t.publishedAt,
    ),
  }),
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
  (t) => ({
    postIdx: index("post_images_post_idx").on(t.postId),
    postSortUq: uniqueIndex("post_images_post_sort_uq").on(
      t.postId,
      t.sortOrder,
    ),
  }),
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
  (t) => ({
    postUq: uniqueIndex("post_videos_post_uq").on(t.postId),
    streamUidUq: uniqueIndex("post_videos_stream_uid_uq").on(t.streamUid),
  }),
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
  (t) => ({
    pk: primaryKey({ columns: [t.postId, t.catId] }),
    catIdx: index("post_cat_tags_cat_idx").on(t.catId),
  }),
);

export const hashtags = sqliteTable(
  "hashtags",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    createdAt: integer("created_at").notNull(),
  },
  (t) => ({
    nameUq: uniqueIndex("hashtags_name_uq").on(t.name),
  }),
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
  (t) => ({
    pk: primaryKey({ columns: [t.postId, t.hashtagId] }),
    hashtagIdx: index("post_hashtags_hashtag_idx").on(t.hashtagId),
  }),
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
  (t) => ({
    pk: primaryKey({ columns: [t.userId, t.catId] }),
    catIdx: index("follows_cat_idx").on(t.catId),
  }),
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
  (t) => ({
    pk: primaryKey({ columns: [t.userId, t.postId] }),
    postIdx: index("likes_post_idx").on(t.postId),
  }),
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
  (t) => ({
    postCreatedIdx: index("comments_post_created_idx").on(
      t.postId,
      t.createdAt,
    ),
    parentIdx: index("comments_parent_idx").on(t.parentCommentId),
  }),
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
  (t) => ({
    pk: primaryKey({ columns: [t.userId, t.postId] }),
    userCreatedIdx: index("bookmarks_user_created_idx").on(
      t.userId,
      t.createdAt,
    ),
  }),
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
  (t) => ({
    userCreatedIdx: index("notifications_user_created_idx").on(
      t.userId,
      t.createdAt,
    ),
    userReadIdx: index("notifications_user_read_idx").on(
      t.userId,
      t.readAt,
    ),
  }),
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
  (t) => ({
    pk: primaryKey({ columns: [t.blockerUserId, t.blockedUserId] }),
  }),
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
  (t) => ({
    pk: primaryKey({ columns: [t.userId, t.catId] }),
  }),
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
  (t) => ({
    targetIdx: index("reports_target_idx").on(t.targetType, t.targetId),
    statusIdx: index("reports_status_idx").on(t.status, t.createdAt),
  }),
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
  (t) => ({
    userIdx: index("media_sessions_user_idx").on(t.userId),
    expiresIdx: index("media_sessions_expires_idx").on(t.expiresAt),
  }),
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
  (t) => ({
    sessionIdx: index("moderation_results_session_idx").on(t.mediaSessionId),
    postIdx: index("moderation_results_post_idx").on(t.postId),
  }),
);
```

## 4. enum相当の値

SQLiteではDB enumを使わず、アプリ側でliteral union / validationを持つ。

### sex
- male
- female
- unknown

### post.type
- image
- video

### post.status
- draft
- moderation
- published
- rejected
- deleted

### moderation result
- ALLOW
- REJECT
- REVIEW

### media session status
- pending
- uploading
- processing
- allow
- reject
- expired

### report target
- post
- cat
- user

### notification type
- follow
- like
- comment
- comment_reply
- mention

## 5. MVP時に追加検討する集計カラム

D1で毎回COUNTすると負荷が増えるため、必要になったら以下をキャッシュ的に持つ。

cats:
- followersCount
- postsCount

posts:
- likesCount
- commentsCount
- bookmarksCount

初期は正規化優先でもよいが、タイムライン負荷が増えた段階で追加する。

## 6. DB制約でなくアプリ側で守るもの

- postImagesは最大4件
- postVideosは1件
- 画像と動画の混在不可
- 動画30秒以内
- authorCatIdのownerUserIdが認証ユーザーと一致
- 投稿公開には全メディアがALLOW
- REVIEW状態ではpublish不可

## 7. Migration方針

- `drizzle-kit generate`
- migration SQLをGit管理
- staging D1で先に適用
- productionへ適用
- destructive migrationは段階的に行う

## 8. 今後の追加候補

- post_views
- recommendation_impressions
- search_history
- hashtag_trends
- daily_post_stats
- cat_stats
- moderation_audit_logs
