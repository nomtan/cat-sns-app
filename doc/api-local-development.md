# APIローカル開発

最終更新: 2026-09-04

## 1. 依存関係

```bash
pnpm install
```

## 2. D1 database_id

Cloudflare側のD1をまだ作成していない場合でもWrangler local D1で開発可能。
remoteへ接続する場合は `apps/api/wrangler.jsonc` の `database_id` を実際のD1 IDへ設定する。

## 3. Better Auth環境変数

```bash
cp apps/api/.dev.vars.example apps/api/.dev.vars
```

最低限必要:

```text
BETTER_AUTH_SECRET=<32文字以上の十分ランダムな値>
BETTER_AUTH_URL=http://localhost:8787
TRUSTED_ORIGINS=http://localhost:3000,cat-sns://
```

Google / Appleログインを使う場合は追加する。

```text
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
APPLE_CLIENT_ID=
APPLE_CLIENT_SECRET=
```

## 4. Migration

```bash
pnpm --filter @cat-sns/api db:migrate:local
```

Better Auth用テーブルもmigrationで作成される。

- user
- session
- account
- verification

## 5. Seed

```bash
pnpm --filter @cat-sns/api db:seed:local
```

基本猫種マスタのみ投入する。

## 6. API起動

```bash
pnpm --filter @cat-sns/api dev
```

## 7. Better Authで開発ユーザー作成

メール / パスワードで登録する例:

```bash
curl -X POST http://localhost:8787/api/auth/sign-up/email \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{
    "name": "local-user",
    "email": "dev@example.com",
    "password": "password1234"
  }'
```

Better AuthのCookieを利用して保護APIへアクセスする。

## 8. 動作確認

Health:

```bash
curl http://localhost:8787/health
curl http://localhost:8787/health/db
```

猫種:

```bash
curl http://localhost:8787/api/v1/breeds
```

猫登録:

```bash
curl -X POST http://localhost:8787/api/v1/cats \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "name": "むぎ",
    "sex": "male",
    "breedId": "breed-mixed",
    "coatColor": "茶白"
  }'
```

## 9. R2メディアアップロード

`MEDIA_BUCKET` bindingは `cat-sns-images` を利用する。

画像1枚の例:

1. メディアセッション作成

```bash
curl -X POST http://localhost:8787/api/v1/media/sessions \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "type": "image",
    "count": 1,
    "mimeTypes": ["image/jpeg"]
  }'
```

レスポンスの `items[0].uploadUrl` に対して画像本体をPUTする。

```bash
curl -X PUT "<uploadUrl>" \
  -H "Content-Type: image/jpeg" \
  -b cookies.txt \
  --data-binary @cat.jpg
```

アップロード後にcompleteする。

```bash
curl -X POST "http://localhost:8787/api/v1/media/sessions/<sessionId>/items/<itemId>/complete" \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "width": 1600,
    "height": 1200,
    "clientDecision": "ALLOW"
  }'
```

`complete` はR2上に実体が存在しない場合 `MEDIA_NOT_UPLOADED` を返す。

MVPではWorker経由でR2へPUTする。将来、大容量転送の負荷が問題になった場合はS3互換APIの署名URL方式へ移行する。

## 10. 現在のAPI

Better Auth:
- ALL /api/auth/*

公開:
- GET /health
- GET /health/db
- GET /api/v1
- GET /api/v1/breeds
- GET /api/v1/cats/:catId
- GET /api/v1/cats/:catId/posts
- GET /api/v1/posts/:postId

認証必須:
- POST /api/v1/cats
- PATCH /api/v1/cats/:catId
- DELETE /api/v1/cats/:catId
- GET /api/v1/me/cats
- POST /api/v1/cats/:catId/follow
- DELETE /api/v1/cats/:catId/follow
- POST /api/v1/media/sessions
- PUT /api/v1/media/sessions/:sessionId/items/:itemId/upload
- POST /api/v1/media/sessions/:sessionId/items/:itemId/complete
- GET /api/v1/media/sessions/:sessionId
- POST /api/v1/posts
- DELETE /api/v1/posts/:postId

## 11. 次の実装

- Workers AIによるREVIEW最終判定
- Cloudflare Stream動画アップロード
- タイムラインAPI
- Better Auth Expo Client
- Google / Apple OAuth本番設定
