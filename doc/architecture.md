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
- 状態管理ライブラリ
- Web / Mobile共通のデザイントークン実装方法
- 状態管理ライブラリ
- Web / Mobile共通のデザイントークン実装方法


## 9. API / DBアクセス

- APIフレームワーク: Hono
- ORM / D1アクセス: Drizzle ORM

Drizzle ORMを採用する理由:
- Cloudflare D1との相性が良い
- TypeScriptでスキーマ定義できる
- 型安全なクエリを記述できる
- マイグレーションをDrizzle Kitで管理できる
- SQLを必要に応じて直接扱えるため、重すぎない

## 10. 認証基盤

第一候補として Clerk を採用する。

要件:
- Apple認証
- Google認証
- メールアドレス認証
- Web / iOS / Androidで共通利用
- Expo / React Native対応

Cloudflare Workers API側ではClerkのセッション / トークンを検証し、アプリ固有ユーザー情報はD1で管理する。

将来的にコストやベンダーロックインが問題になった場合は、Better Auth等のセルフホスト型認証への移行余地を残す。

## 11. 画像判定

猫画像判定は TensorFlow.js + MobileNet 系を採用する。

ただし、単純なMobileNet画像分類だけでは「画像の中のどこに猫がいるか」や「猫が小さく写っているケース」の検出に弱いため、実装時はTensorFlow.js上のCOCO-SSD（MobileNetバックボーン）も有力候補とする。

画像判定は以下の2系統に分離する。
- 猫画像 / 実写判定
- 安全性 / モデレーション判定

TensorFlow.js + MobileNet系は主に猫検出側で利用し、安全性判定は別モデルを採用する。
