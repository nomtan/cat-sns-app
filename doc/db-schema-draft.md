# Cat SNS App DBスキーマたたき台

最終更新: 2026-09-04
ステータス: Draft

## 1. 方針

- Cloudflare D1を利用する
- SNSドメイン側ORMはDrizzle ORM
- 認証はBetter Auth
- 認証主体はユーザーだが、SNS上の公開主体は猫
- ユーザー情報は原則公開しない

## 2. Better Authコアテーブル

Better Authが以下を管理する。

- user
- session
- account
- verification

`user.id`をSNS内部ユーザーIDの基準とする。

## 3. users

SNS内部管理用ユーザーミラーテーブル。

主なカラム:
- id
- auth_user_id
- email
- created_at
- updated_at
- deleted_at

備考:
- Better Auth `user.id` と同一IDを利用する
- 公開プロフィール用途では使わない
- 猫・フォロー・コメント等の内部FK用途に利用する

## 4. cats

主なカラム:
- id
- owner_user_id
- name
- icon_image_key
- sex
- birthday
- breed_id
- coat_color
- created_at
- updated_at
- deleted_at

備考:
- 原則公開
- 投稿主体
- フォロー対象

## 5. その他主要テーブル

- breeds
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
Better Authコアテーブルは `apps/api/drizzle/0001_better_auth.sql` を参照する。

## 6. 方針上の注意

- 画像投稿は最大4枚
- 動画はMVPで1投稿1本 / 最大30秒
- 画像と動画の混在投稿はMVPでは不可
- 投稿公開には全メディアが最終ALLOWであること
- REVIEWはWorkers AI Visionで確定する
- 公開UIにはユーザー情報を出さない
