# Cat SNS App アーキテクチャ方針

最終更新: 2026-09-01

## 1. 基本方針

Web / iOS / Androidを1リポジトリで管理するモノレポ構成とする。

UIコンポーネントをWebとMobileで無理に共通化せず、以下を共通パッケージとして共有する。

- TypeScript型
- APIクライアント
- バリデーション
- ドメインロジック
- 定数
- ユーティリティ
- 必要に応じて状態管理ロジック

## 2. Mobile

- React Native
- Expo
- Expo Router
- HeroUI Native
- TypeScript

iOS / Androidは同一のReact Nativeアプリとして管理する。

## 3. Web

- Next.js
- HeroUI React
- TypeScript
- Cloudflare Workers上へデプロイする方針

猫プロフィールや投稿ページは公開Webページとして利用されるため、SSR / SEOを考慮した構成とする。

HeroUI NativeはWebでは使用せず、HeroUI Reactを利用する。

## 4. パッケージ管理

- pnpm
- pnpm workspaceによるモノレポ管理

## 5. 推奨ディレクトリ構成

```text
cat-sns-app/
├─ apps/
│  ├─ mobile/              # Expo / React Native
│  ├─ web/                 # Next.js / HeroUI React
│  └─ api/                 # Cloudflare Workers API
│
├─ packages/
│  ├─ api-client/          # Web/Mobile共通APIクライアント
│  ├─ types/               # 共通TypeScript型
│  ├─ validation/          # 共通バリデーション
│  ├─ domain/              # ドメインロジック
│  ├─ config/              # 共通設定
│  └─ utils/               # 共通ユーティリティ
│
├─ doc/
│  ├─ service-spec.md
│  └─ architecture.md
│
├─ pnpm-workspace.yaml
└─ package.json
```

## 6. UI共有方針

UIそのものはWebとMobileで分離する。

### Mobile
- HeroUI Native

### Web
- HeroUI React

ただし、以下は共通化する。

- デザイントークン
  - 色
  - 余白
  - 角丸
  - タイポグラフィ定義
- APIレスポンス型
- ViewModel相当の整形処理
- バリデーションルール

WebとMobileで見た目と操作感は揃えるが、React DOMとReact Nativeの差を吸収するため、UIコンポーネント自体の共通化は原則行わない。

## 7. Cloudflare

- Workers: API
- D1: RDB
- R2: 画像原本
- Images: リサイズ / 最適化 / CDN
- Queues: 画像判定・通知等
- Turnstile: Web bot対策
- KV: 必要になった段階で導入

## 8. 今後決める事項

- Next.jsのCloudflareデプロイ方式の最終決定
- APIフレームワーク
- ORM / D1アクセスライブラリ
- 認証基盤
- 画像判定に使用する具体的なモデル / API
- 状態管理ライブラリ
- Web / Mobile共通のデザイントークン実装方法
