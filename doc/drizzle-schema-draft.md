# Cat SNS App Drizzle Schema設計

最終更新: 2026-09-04
ステータス: Draft
対象: Cloudflare D1 / Drizzle ORM

## 1. 基本方針

- SQLite / D1
- SNSドメイン側のみDrizzle ORMを利用
- Better AuthはD1 bindingを直接利用
- 公開ユーザー情報は持たない
- SNS内部の`users`はBetter Auth `user.id`をミラーする

## 2. users

現在の実装:

```ts
export const users = sqliteTable(
  "users",
  {
    id: text("id").primaryKey(),
    authUserId: text("auth_user_id").notNull(),
    email: text("email").notNull(),
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
    deletedAt: integer("deleted_at"),
  },
  (table) => [
    uniqueIndex("users_auth_user_id_uq").on(table.authUserId),
    index("users_email_idx").on(table.email),
  ],
);
```

`id` と `authUserId` は通常Better Authの `user.id` と同一値を利用する。

## 3. Better Authテーブル

Better AuthコアテーブルはDrizzle schemaではなくBetter Auth用migrationで管理する。

- user
- session
- account
- verification

参照:
- `apps/api/drizzle/0001_better_auth.sql`
- `apps/api/src/auth.ts`

## 4. SNSドメインテーブル

Drizzleで管理する。

- users
- breeds
- cats
- posts
- post_images
- post_videos
- post_cat_tags
- hashtags
- post_hashtags
- follows
- likes
- comments
- bookmarks
- notifications
- blocks
- cat_mutes
- reports
- media_sessions
- moderation_results

具体的な定義は `apps/api/src/db/schema.ts` を正本とする。

## 5. ID方針

- Better Auth: UUID生成
- SNSドメイン: `crypto.randomUUID()` を基本とする
- 連番IDは公開しない

## 6. Migration方針

- migration SQLはGit管理
- local D1で確認後remoteへ適用
- Better Authスキーマ変更時はBetter Authの現行コアスキーマを確認する
- SNSドメイン変更時はDrizzle schemaとmigrationの差分を一致させる

## 7. アプリ側で守る制約

- 画像は1投稿最大4枚
- 動画は1投稿1本
- 画像 / 動画混在はMVPでは不可
- 動画はMVP最大30秒
- 投稿主体の猫が認証ユーザー管理下であること
- 全メディアがALLOWになるまでpublish不可
