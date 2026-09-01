# Cat SNS App DBスキーマたたき台

最終更新: 2026-09-01
ステータス: Draft

## 1. 方針

- Cloudflare D1を利用する
- ORMはDrizzle ORM
- 認証主体はユーザーだが、SNS上の公開主体は猫
- ユーザー情報は原則公開しない
- 猫・投稿・フォローを中心に設計する

## 2. users

認証済みユーザーの内部管理用テーブル。

主なカラム:
- id
- clerk_user_id
- email
- created_at
- updated_at
- deleted_at

備考:
- 公開プロフィール用途では使わない
- 猫プロフィールの管理者として内部的に紐付ける

## 3. cats

猫プロフィール。

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

## 4. breeds

猫種マスタ。

主なカラム:
- id
- name_ja
- name_en
- sort_order

## 5. posts

投稿本体。

主なカラム:
- id
- author_cat_id
- type
- body
- status
- published_at
- created_at
- updated_at
- deleted_at

type:
- image
- video

status:
- draft
- moderation
- published
- rejected
- deleted

## 6. post_images

画像投稿の画像。

主なカラム:
- id
- post_id
- r2_key
- sort_order
- width
- height
- mime_type
- moderation_status
- moderation_reason
- created_at

制約:
- 1投稿最大4枚

## 7. post_videos

動画投稿。

主なカラム:
- id
- post_id
- stream_uid
- duration_seconds
- width
- height
- moderation_status
- created_at

制約:
- 1投稿1動画
- MVPでは最大30秒

## 8. post_cat_tags

投稿に写っている猫のタグ付け。

主なカラム:
- post_id
- cat_id
- created_at

備考:
- 投稿者の猫とは別に複数猫をタグ付け可能

## 9. hashtags

ハッシュタグ。

主なカラム:
- id
- name
- created_at

## 10. post_hashtags

投稿とハッシュタグの中間テーブル。

主なカラム:
- post_id
- hashtag_id

## 11. follows

ユーザーが猫をフォローする関係。

主なカラム:
- user_id
- cat_id
- created_at

制約:
- user_id + cat_id をユニーク

## 12. likes

投稿へのいいね。

主なカラム:
- user_id
- post_id
- created_at

制約:
- user_id + post_id をユニーク

## 13. comments

投稿コメントと返信。

主なカラム:
- id
- post_id
- user_id
- parent_comment_id
- body
- created_at
- updated_at
- deleted_at

備考:
- parent_comment_idがNULLなら投稿へのコメント
- 値があれば返信

## 14. bookmarks

投稿保存。

主なカラム:
- user_id
- post_id
- created_at

制約:
- user_id + post_id をユニーク

## 15. notifications

通知。

主なカラム:
- id
- user_id
- type
- actor_user_id
- cat_id
- post_id
- comment_id
- read_at
- created_at

type候補:
- follow
- like
- comment
- comment_reply
- mention

## 16. blocks

ユーザー単位のブロック。

主なカラム:
- blocker_user_id
- blocked_user_id
- created_at

## 17. mutes

ユーザー単位または猫単位のミュート。

主なカラム:
- user_id
- muted_user_id
- muted_cat_id
- created_at

実装時に対象単位を最終決定する。

## 18. reports

通報。

主なカラム:
- id
- reporter_user_id
- target_type
- target_id
- reason
- detail
- status
- created_at
- resolved_at

target_type:
- post
- cat
- user

status:
- pending
- reviewing
- resolved
- rejected

## 19. moderation_results

画像・動画フレームのモデレーション結果。

主なカラム:
- id
- post_id
- media_type
- media_id
- stage
- result
- reason
- scores_json
- model
- created_at

stage:
- local
- workers_ai

result:
- ALLOW
- REJECT
- REVIEW

備考:
- REVIEWのみWorkers AI Visionへエスカレーション
- 動画は抽出フレーム単位の結果も保持できる形にする

## 20. 今後決める事項

- ID方式（UUID / ULID等）
- 論理削除の扱い
- commentsの返信深度
- 通知保持期間
- moderation_resultsの保存期間
- 検索用インデックス
- タイムライン高速化用集計テーブル
