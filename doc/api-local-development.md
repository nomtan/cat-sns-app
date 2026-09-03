# APIローカル開発

## 1. 依存関係

```bash
pnpm install
```

## 2. D1 database_id

Cloudflare側のD1をまだ作成していない場合でも、Wranglerのlocal D1で開発可能。

remoteへ接続する場合は `apps/api/wrangler.jsonc` の
`REPLACE_WITH_D1_DATABASE_ID` を実際のdatabase_idへ置換する。

## 3. 開発用認証

Clerk接続前のローカル開発のみ、dev authを利用できる。

```bash
cp apps/api/.dev.vars.example apps/api/.dev.vars
```

`.dev.vars`:

```text
AUTH_MODE=dev
```

保護APIには以下を付与する。

```text
x-dev-user-id: dev-user-1
```

AUTH_MODEがdev以外の場合、dev headerでは認証できない。
Clerk本接続後はこのミドルウェアをClerk token検証へ差し替える。

## 4. Migration

```bash
pnpm --filter @cat-sns/api db:migrate:local
```

## 5. Seed

```bash
pnpm --filter @cat-sns/api db:seed:local
```

以下を投入する。

- 開発ユーザー: `dev-user-1`
- 基本猫種マスタ

## 6. API起動

```bash
pnpm --filter @cat-sns/api dev
```

## 7. 動作確認

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
  -H "x-dev-user-id: dev-user-1" \
  -d '{
    "name": "むぎ",
    "sex": "male",
    "breedId": "breed-mixed",
    "coatColor": "茶白"
  }'
```

自分の猫一覧:

```bash
curl http://localhost:8787/api/v1/me/cats \
  -H "x-dev-user-id: dev-user-1"
```

## 8. 現在のAPI

公開:
- GET /health
- GET /health/db
- GET /api/v1
- GET /api/v1/breeds
- GET /api/v1/cats/:catId
- GET /api/v1/cats/:catId/posts

認証必須:
- POST /api/v1/cats
- PATCH /api/v1/cats/:catId
- DELETE /api/v1/cats/:catId
- GET /api/v1/me/cats
- POST /api/v1/cats/:catId/follow
- DELETE /api/v1/cats/:catId/follow

## 9. 次の実装

- Clerk認証
- R2画像アップロード
- 投稿API
- タイムラインAPI
