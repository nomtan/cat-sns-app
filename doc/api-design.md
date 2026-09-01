# Cat SNS App API設計

最終更新: 2026-09-02
ステータス: Draft
前提: Hono / Cloudflare Workers / Clerk / D1 / Drizzle ORM

## 1. API基本方針

- Base path: `/api/v1`
- JSON API
- 認証が必要なAPIはClerkのBearer Tokenを必須とする
- 公開閲覧系APIは未認証でも利用可能
- ページングはcursor方式
- 日時はISO 8601
- IDは文字列型
- エラー形式は共通化する

### 共通レスポンス例

成功:

```json
{
  "data": {}
}
```

一覧:

```json
{
  "data": [],
  "nextCursor": "..."
}
```

エラー:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "入力内容を確認してください",
    "details": {}
  }
}
```

## 2. Auth / User

### GET /api/v1/me
認証中ユーザーの内部情報を取得。

Auth: required

返却:
- id
- email
- managedCatsCount
- createdAt

### DELETE /api/v1/me
アカウント削除。

Auth: required

## 3. Cats

### GET /api/v1/cats/:catId
公開猫プロフィール取得。

Auth: optional

返却:
- id
- name
- iconUrl
- sex
- birthday
- breed
- coatColor
- followersCount
- postsCount
- isFollowing

飼い主ユーザー情報は返却しない。

### GET /api/v1/me/cats
自分が管理する猫一覧。

Auth: required

### POST /api/v1/cats
猫登録。

Auth: required

Body:
- name
- iconUploadId または iconKey
- sex
- birthday
- breedId
- coatColor

### PATCH /api/v1/cats/:catId
自分が管理する猫を編集。

Auth: required

### DELETE /api/v1/cats/:catId
自分が管理する猫を削除。

Auth: required

### GET /api/v1/cats/:catId/posts
猫ごとの公開投稿一覧。

Auth: optional
Query:
- cursor
- limit

## 4. Follow

### POST /api/v1/cats/:catId/follow
猫をフォロー。

Auth: required

### DELETE /api/v1/cats/:catId/follow
猫のフォロー解除。

Auth: required

### GET /api/v1/cats/:catId/followers
フォロワー一覧はMVPでは公開しない。

必要になった場合のみ追加。

## 5. Feed

### GET /api/v1/feed/recommended
おすすめタイムライン。

Auth: optional

Query:
- cursor
- limit

仕様:
- 公開投稿のみ
- モデレーション通過済みのみ
- ブロック / ミュート対象除外
- ルールベースランキング
- 新規猫探索枠を含む

### GET /api/v1/feed/following
フォロー中タイムライン。

Auth: required

Query:
- cursor
- limit

仕様:
- フォロー中猫の投稿をpublishedAt DESC
- フォロー猫0件の場合は空配列

## 6. Posts

### POST /api/v1/posts
投稿作成。

Auth: required

Body:
- authorCatId
- type: image | video
- body
- hashtagNames[]
- taggedCatIds[]
- mediaSessionId

前提:
- mediaSessionIdに紐づくメディア判定が最終ALLOWであること

### GET /api/v1/posts/:postId
投稿詳細。

Auth: optional

### DELETE /api/v1/posts/:postId
自分が管理する猫の投稿を削除。

Auth: required

### PATCH /api/v1/posts/:postId
本文 / タグ等の編集。

Auth: required

## 7. Media upload

投稿前にメディアアップロードセッションを作る。

### POST /api/v1/media/sessions
アップロードセッション作成。

Auth: required

Body:
- type: image | video
- count

返却:
- mediaSessionId
- uploadTargets[]

### POST /api/v1/media/images/complete
画像アップロード完了通知。

Auth: required

Body:
- mediaSessionId
- imageKey
- width
- height
- mimeType
- sizeBytes

処理:
1. メディア情報保存
2. 軽量判定結果を受け取る
3. ALLOW / REJECT / REVIEWへ集約
4. REVIEWのみWorkers AI Visionへ
5. 最終moderationStatus保存

### POST /api/v1/media/videos/complete
Cloudflare Streamアップロード完了通知。

Auth: required

Body:
- mediaSessionId
- streamUid

処理:
1. Streamメタデータ取得
2. 尺30秒チェック
3. フレーム抽出 / 判定
4. REVIEWのみWorkers AI Vision
5. 最終moderationStatus保存

### GET /api/v1/media/sessions/:mediaSessionId
判定状況取得。

返却:
- status: pending | processing | allow | reject
- items[]
- reason

## 8. Likes

### POST /api/v1/posts/:postId/like
いいね。

Auth: required

### DELETE /api/v1/posts/:postId/like
いいね解除。

Auth: required

## 9. Comments

### GET /api/v1/posts/:postId/comments
コメント一覧。

Auth: optional
Query:
- cursor
- limit

### POST /api/v1/posts/:postId/comments
コメント投稿。

Auth: required

Body:
- body
- parentCommentId? 

### DELETE /api/v1/comments/:commentId
自分のコメント削除。

Auth: required

## 10. Bookmarks

### POST /api/v1/posts/:postId/bookmark
保存。

Auth: required

### DELETE /api/v1/posts/:postId/bookmark
保存解除。

Auth: required

### GET /api/v1/me/bookmarks
保存一覧。

Auth: required

## 11. Search

### GET /api/v1/search
Query:
- q
- type: all | cats | breeds | hashtags
- cursor
- limit

検索対象:
- 猫名
- 猫種
- ハッシュタグ

ユーザーは検索対象外。

### GET /api/v1/hashtags/:name/posts
ハッシュタグ投稿一覧。

## 12. Notifications

### GET /api/v1/notifications
Auth: required

Query:
- cursor
- limit

### POST /api/v1/notifications/read
Auth: required

Body:
- notificationIds[]

### POST /api/v1/notifications/read-all
Auth: required

## 13. Blocks

### POST /api/v1/blocks/users/:userId
内部ユーザー単位でブロック。

Auth: required

### DELETE /api/v1/blocks/users/:userId
解除。

Auth: required

### GET /api/v1/me/blocks
設定画面用。

Auth: required

## 14. Mutes

### POST /api/v1/mutes/cats/:catId
猫単位でミュート。

Auth: required

### DELETE /api/v1/mutes/cats/:catId
解除。

Auth: required

### GET /api/v1/me/mutes
設定画面用。

Auth: required

## 15. Reports

### POST /api/v1/reports
Auth: required

Body:
- targetType: post | cat | user
- targetId
- reason
- detail?

## 16. Admin API

Base:
- /api/v1/admin

管理者権限必須。

候補:
- GET /reports
- GET /reports/:reportId
- PATCH /reports/:reportId
- GET /posts/:postId/moderation
- DELETE /posts/:postId
- POST /users/:userId/suspend

## 17. MVPエラーコード候補

- UNAUTHORIZED
- FORBIDDEN
- NOT_FOUND
- VALIDATION_ERROR
- RATE_LIMITED
- MEDIA_NOT_READY
- MEDIA_REJECTED
- MODERATION_PENDING
- MODERATION_REJECTED
- VIDEO_TOO_LONG
- TOO_MANY_IMAGES
- INVALID_MEDIA_TYPE
- INTERNAL_ERROR

## 18. Rate limit候補

初期案:
- 投稿作成: 20 / hour / user
- コメント: 60 / hour / user
- いいね: 300 / hour / user
- フォロー: 100 / hour / user
- 通報: 20 / day / user

Cloudflare側で調整する。

## 19. Hono構成案

```text
apps/api/src/
├─ index.ts
├─ middleware/
│  ├─ auth.ts
│  ├─ rate-limit.ts
│  └─ error-handler.ts
├─ routes/
│  ├─ me.ts
│  ├─ cats.ts
│  ├─ feed.ts
│  ├─ posts.ts
│  ├─ media.ts
│  ├─ comments.ts
│  ├─ search.ts
│  ├─ notifications.ts
│  └─ reports.ts
├─ services/
│  ├─ moderation/
│  ├─ feed/
│  ├─ media/
│  └─ notification/
└─ db/
   ├─ client.ts
   └─ schema.ts
```
