PRAGMA foreign_keys = ON;

CREATE TABLE users (
  id TEXT PRIMARY KEY NOT NULL,
  clerk_user_id TEXT NOT NULL,
  email TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER
);
CREATE UNIQUE INDEX users_clerk_user_id_uq ON users (clerk_user_id);
CREATE INDEX users_email_idx ON users (email);

CREATE TABLE breeds (
  id TEXT PRIMARY KEY NOT NULL,
  name_ja TEXT NOT NULL,
  name_en TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX breeds_name_ja_idx ON breeds (name_ja);

CREATE TABLE cats (
  id TEXT PRIMARY KEY NOT NULL,
  owner_user_id TEXT NOT NULL REFERENCES users(id),
  name TEXT NOT NULL,
  icon_image_key TEXT,
  sex TEXT NOT NULL,
  birthday TEXT,
  breed_id TEXT REFERENCES breeds(id),
  coat_color TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER
);
CREATE INDEX cats_owner_idx ON cats (owner_user_id);
CREATE INDEX cats_name_idx ON cats (name);
CREATE INDEX cats_breed_idx ON cats (breed_id);

CREATE TABLE posts (
  id TEXT PRIMARY KEY NOT NULL,
  author_cat_id TEXT NOT NULL REFERENCES cats(id),
  type TEXT NOT NULL,
  body TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  published_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER
);
CREATE INDEX posts_author_published_idx ON posts (author_cat_id, published_at);
CREATE INDEX posts_status_published_idx ON posts (status, published_at);

CREATE TABLE post_images (
  id TEXT PRIMARY KEY NOT NULL,
  post_id TEXT NOT NULL REFERENCES posts(id),
  r2_key TEXT NOT NULL,
  sort_order INTEGER NOT NULL,
  width INTEGER,
  height INTEGER,
  mime_type TEXT,
  size_bytes INTEGER,
  moderation_status TEXT NOT NULL DEFAULT 'pending',
  moderation_reason TEXT,
  created_at INTEGER NOT NULL
);
CREATE INDEX post_images_post_idx ON post_images (post_id);
CREATE UNIQUE INDEX post_images_post_sort_uq ON post_images (post_id, sort_order);

CREATE TABLE post_videos (
  id TEXT PRIMARY KEY NOT NULL,
  post_id TEXT NOT NULL REFERENCES posts(id),
  stream_uid TEXT NOT NULL,
  duration_seconds INTEGER,
  width INTEGER,
  height INTEGER,
  moderation_status TEXT NOT NULL DEFAULT 'pending',
  created_at INTEGER NOT NULL
);
CREATE UNIQUE INDEX post_videos_post_uq ON post_videos (post_id);
CREATE UNIQUE INDEX post_videos_stream_uid_uq ON post_videos (stream_uid);

CREATE TABLE post_cat_tags (
  post_id TEXT NOT NULL REFERENCES posts(id),
  cat_id TEXT NOT NULL REFERENCES cats(id),
  created_at INTEGER NOT NULL,
  PRIMARY KEY (post_id, cat_id)
);
CREATE INDEX post_cat_tags_cat_idx ON post_cat_tags (cat_id);

CREATE TABLE hashtags (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE UNIQUE INDEX hashtags_name_uq ON hashtags (name);

CREATE TABLE post_hashtags (
  post_id TEXT NOT NULL REFERENCES posts(id),
  hashtag_id TEXT NOT NULL REFERENCES hashtags(id),
  PRIMARY KEY (post_id, hashtag_id)
);
CREATE INDEX post_hashtags_hashtag_idx ON post_hashtags (hashtag_id);

CREATE TABLE follows (
  user_id TEXT NOT NULL REFERENCES users(id),
  cat_id TEXT NOT NULL REFERENCES cats(id),
  created_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, cat_id)
);
CREATE INDEX follows_cat_idx ON follows (cat_id);

CREATE TABLE likes (
  user_id TEXT NOT NULL REFERENCES users(id),
  post_id TEXT NOT NULL REFERENCES posts(id),
  created_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, post_id)
);
CREATE INDEX likes_post_idx ON likes (post_id);

CREATE TABLE comments (
  id TEXT PRIMARY KEY NOT NULL,
  post_id TEXT NOT NULL REFERENCES posts(id),
  user_id TEXT NOT NULL REFERENCES users(id),
  parent_comment_id TEXT,
  body TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER
);
CREATE INDEX comments_post_created_idx ON comments (post_id, created_at);
CREATE INDEX comments_parent_idx ON comments (parent_comment_id);

CREATE TABLE bookmarks (
  user_id TEXT NOT NULL REFERENCES users(id),
  post_id TEXT NOT NULL REFERENCES posts(id),
  created_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, post_id)
);
CREATE INDEX bookmarks_user_created_idx ON bookmarks (user_id, created_at);

CREATE TABLE notifications (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id),
  type TEXT NOT NULL,
  actor_user_id TEXT REFERENCES users(id),
  cat_id TEXT REFERENCES cats(id),
  post_id TEXT REFERENCES posts(id),
  comment_id TEXT REFERENCES comments(id),
  read_at INTEGER,
  created_at INTEGER NOT NULL
);
CREATE INDEX notifications_user_created_idx ON notifications (user_id, created_at);
CREATE INDEX notifications_user_read_idx ON notifications (user_id, read_at);

CREATE TABLE blocks (
  blocker_user_id TEXT NOT NULL REFERENCES users(id),
  blocked_user_id TEXT NOT NULL REFERENCES users(id),
  created_at INTEGER NOT NULL,
  PRIMARY KEY (blocker_user_id, blocked_user_id)
);

CREATE TABLE cat_mutes (
  user_id TEXT NOT NULL REFERENCES users(id),
  cat_id TEXT NOT NULL REFERENCES cats(id),
  created_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, cat_id)
);

CREATE TABLE reports (
  id TEXT PRIMARY KEY NOT NULL,
  reporter_user_id TEXT NOT NULL REFERENCES users(id),
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  reason TEXT NOT NULL,
  detail TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at INTEGER NOT NULL,
  resolved_at INTEGER
);
CREATE INDEX reports_target_idx ON reports (target_type, target_id);
CREATE INDEX reports_status_idx ON reports (status, created_at);

CREATE TABLE media_sessions (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id),
  type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE INDEX media_sessions_user_idx ON media_sessions (user_id);
CREATE INDEX media_sessions_expires_idx ON media_sessions (expires_at);

CREATE TABLE moderation_results (
  id TEXT PRIMARY KEY NOT NULL,
  media_session_id TEXT REFERENCES media_sessions(id),
  post_id TEXT REFERENCES posts(id),
  media_type TEXT NOT NULL,
  media_id TEXT,
  frame_timestamp_ms INTEGER,
  stage TEXT NOT NULL,
  result TEXT NOT NULL,
  reason TEXT,
  scores_json TEXT,
  model TEXT,
  created_at INTEGER NOT NULL
);
CREATE INDEX moderation_results_session_idx ON moderation_results (media_session_id);
CREATE INDEX moderation_results_post_idx ON moderation_results (post_id);
