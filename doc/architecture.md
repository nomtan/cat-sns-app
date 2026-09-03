# Cat SNS App アーキテクチャ方針

最終更新: 2026-09-04

## 1. 基本方針

Web / iOS / Androidを1リポジトリで管理するpnpmモノレポ構成とする。

共有対象:
- TypeScript型
- APIクライアント
- バリデーション
- ドメインロジック
- 定数 / ユーティリティ
- デザイントークン

UIコンポーネント自体はWebとMobileで原則分離する。

## 2. Mobile

- React Native
- Expo
- Expo Router
- HeroUI Native
- TypeScript
- Better Auth + `@better-auth/expo`
- セッション保存: Expo SecureStore

iOS / Androidは同一アプリとして管理する。

## 3. Web

- Next.js
- HeroUI React
- TypeScript
- Better Auth React Client
- Cloudflare Workersへデプロイする方針

猫プロフィールや投稿ページは公開ページとして扱い、SSR / SEOを考慮する。

## 4. API

- Cloudflare Workers
- Hono
- Base: `/api/v1`
- 認証: Better Auth
- 認証エンドポイント: `/api/auth/*`

Better AuthとHonoはいずれもWeb Standard Request / Responseを利用するため、Better Auth handlerをHonoへ直接マウントする。

## 5. 認証基盤

Better Authを採用する。

対応方式:
- Apple
- Google
- メールアドレス / パスワード

構成:
- Better AuthのDB: Cloudflare D1 bindingを直接利用
- Expo連携: `@better-auth/expo`
- Cloudflare Workers: `nodejs_compat`を有効化
- 保護API: `auth.api.getSession()` でセッション検証

Better Authコアテーブル:
- `user`
- `session`
- `account`
- `verification`

SNS内部の`users`テーブルは公開プロフィールではなく、猫・フォロー・コメント等を結び付ける内部ミラーとして保持する。
Better Authの`user.id`とSNS内部`users.id`は同じ値を利用する。

ユーザー情報はSNS上では原則公開しない。

## 6. DB

- Cloudflare D1
- アプリケーションDBアクセス: Drizzle ORM
- Migration: SQL / Drizzle Kit

Better Auth自身はD1 bindingを直接利用する。
SNSドメイン側はDrizzle ORMを利用する。

主要テーブル:
- users
- cats
- breeds
- posts
- post_images
- post_videos
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

## 7. Cloudflare

- Workers: API / Better Auth
- D1: RDB / Better Auth
- R2: 投稿画像原本
- Images: リサイズ / 最適化 / CDN
- Stream: 動画保存 / 変換 / 配信
- Queues: 画像判定・通知等
- Workers AI Vision: REVIEW画像 / 動画フレームの最終判定
- Turnstile: Web bot対策
- KV: 必要になった段階で導入

## 8. メディアモデレーション

判定結果:
- ALLOW
- REJECT
- REVIEW

画像:
1. TensorFlow.js + COCO-SSDで猫検出
2. NSFWJS等で軽量補助判定
3. ALLOW / REJECT / REVIEWへ集約
4. REVIEWのみWorkers AI Visionへ送信

動画:
- Cloudflare Streamを利用
- MVP最大30秒
- 一定間隔でフレーム抽出
- 各フレームに同じALLOW / REJECT / REVIEW判定を適用
- REVIEWのみWorkers AI Visionへ送信

## 9. ディレクトリ構成

```text
cat-sns-app/
├─ apps/
│  ├─ mobile/
│  ├─ web/
│  └─ api/
├─ packages/
│  ├─ api-client/
│  ├─ types/
│  ├─ validation/
│  ├─ domain/
│  ├─ config/
│  └─ utils/
└─ doc/
```

## 10. 今後決める事項

- Next.jsのCloudflareデプロイ方式
- 状態管理ライブラリ
- Web / Mobile共通デザイントークン実装
- メール認証時のメール配送方式
- Apple / Google OAuth本番設定
- Better Authのメール確認 / パスワードリセットフロー
