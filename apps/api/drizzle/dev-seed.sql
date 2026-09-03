PRAGMA foreign_keys = ON;

INSERT OR IGNORE INTO users (
  id,
  clerk_user_id,
  email,
  created_at,
  updated_at
) VALUES (
  'dev-user-1',
  'dev_clerk_user_1',
  'dev@example.com',
  unixepoch(),
  unixepoch()
);

INSERT OR IGNORE INTO breeds (id, name_ja, name_en, sort_order) VALUES
  ('breed-mixed', 'ミックス', 'Mixed', 1),
  ('breed-american-shorthair', 'アメリカンショートヘア', 'American Shorthair', 10),
  ('breed-british-shorthair', 'ブリティッシュショートヘア', 'British Shorthair', 20),
  ('breed-scottish-fold', 'スコティッシュフォールド', 'Scottish Fold', 30),
  ('breed-ragdoll', 'ラグドール', 'Ragdoll', 40),
  ('breed-munchkin', 'マンチカン', 'Munchkin', 50);
