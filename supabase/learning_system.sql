-- ユーザープロファイル（学習結果を蓄積）
CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) UNIQUE,
  preferred_price_min integer DEFAULT 0,
  preferred_price_max integer DEFAULT 100000,
  preferred_categories text[] DEFAULT '{}',
  preferred_brands text[] DEFAULT '{}',
  preferred_features text[] DEFAULT '{}',
  disliked_features text[] DEFAULT '{}',
  communication_style text DEFAULT 'neutral',
  total_searches integer DEFAULT 0,
  total_clicks integer DEFAULT 0,
  total_favorites integer DEFAULT 0,
  learning_version integer DEFAULT 0,
  updated_at timestamp DEFAULT now()
);

-- 商品フィードバック
CREATE TABLE IF NOT EXISTS product_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id),
  product_id text,
  product_name text,
  product_price integer,
  product_category text,
  feedback_type text,
  session_id uuid,
  created_at timestamp DEFAULT now()
);

-- 会話から学んだ好み
CREATE TABLE IF NOT EXISTS conversation_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id),
  session_id uuid,
  keyword text,
  chosen_price_range text,
  chosen_use_case text,
  chosen_features text[],
  liked_product_id text,
  liked_product_price integer,
  liked_product_category text,
  created_at timestamp DEFAULT now()
);

-- RLS 無効化（サービスロールキーで操作するため）
ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE product_feedback DISABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_insights DISABLE ROW LEVEL SECURITY;
