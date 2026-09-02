# Cat SNS App

猫の実写画像・短尺動画に特化したSNS。

## Repository

pnpm workspaceによるモノレポ構成。

```text
apps/
  api/       Cloudflare Workers + Hono
  mobile/    Expo / React Native（次フェーズ）
  web/       Next.js（次フェーズ）
packages/
  types/     Web / Mobile / API共通型
doc/         仕様・設計ドキュメント
```

## Current implementation

初期API基盤:

- Cloudflare Workers
- Hono
- Cloudflare D1
- Drizzle ORM
- 共通TypeScript型
- `GET /health`
- `GET /health/db`
- `GET /api/v1`
- 初期Drizzle schema

## Requirements

- Node.js: WranglerがサポートするCurrent / Active / Maintenance LTS
- pnpm
- Cloudflare account

## Install

```bash
pnpm install
```

## API local development

```bash
pnpm dev
```

## Cloudflare D1 setup

```bash
pnpm --filter @cat-sns/api exec wrangler d1 create cat-sns-db
```

表示されたdatabase_idを `apps/api/wrangler.jsonc` に設定する。

## Generate migration

```bash
pnpm db:generate
```

ローカルD1へ適用:

```bash
pnpm --filter @cat-sns/api exec wrangler d1 migrations apply cat-sns-db --local
```

remote:

```bash
pnpm --filter @cat-sns/api exec wrangler d1 migrations apply cat-sns-db --remote
```

## Health check

```text
GET /health
GET /health/db
GET /api/v1
```

`/health/db` が成功すればD1 bindingまで接続できている。

## Type check

```bash
pnpm typecheck
```

## Documentation

主要仕様は `doc/` を参照。

- `service-spec.md`
- `architecture.md`
- `api-design.md`
- `drizzle-schema-draft.md`
- `screens-draft.md`
- `user-flows-draft.md`
