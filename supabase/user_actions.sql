-- user_actions: ユーザー行動ログ
CREATE TABLE IF NOT EXISTS user_actions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  action_type TEXT NOT NULL CHECK (action_type IN ('click', 'favorite', 'purchase_click')),
  product_id TEXT NOT NULL,
  product_name TEXT NOT NULL DEFAULT '',
  product_category TEXT NOT NULL DEFAULT '',
  product_price INTEGER NOT NULL DEFAULT 0,
  source TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS user_actions_user_id_idx ON user_actions(user_id);
CREATE INDEX IF NOT EXISTS user_actions_created_at_idx ON user_actions(created_at DESC);

-- user_preferences: ユーザーの好み（集計結果）
CREATE TABLE IF NOT EXISTS user_preferences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  favorite_categories TEXT[] DEFAULT '{}',
  price_range_min INTEGER DEFAULT 0,
  price_range_max INTEGER DEFAULT 100000,
  favorite_sources TEXT[] DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
