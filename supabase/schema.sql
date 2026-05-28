-- =====================================================
-- Navi - データベーススキーマ
-- Supabase SQL Editor で実行してください
-- =====================================================

-- UUID 拡張を有効化
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- テーブル作成
-- =====================================================

-- 1. users（ユーザー情報）
CREATE TABLE IF NOT EXISTS users (
  id            uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  clerk_id      text UNIQUE NOT NULL,
  email         text,
  display_name  text,
  created_at    timestamp DEFAULT now()
);

-- 2. search_history（検索履歴）
CREATE TABLE IF NOT EXISTS search_history (
  id          uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id     uuid REFERENCES users(id) ON DELETE CASCADE,
  query       text,
  created_at  timestamp DEFAULT now()
);

-- 3. favorites（お気に入り）
CREATE TABLE IF NOT EXISTS favorites (
  id             uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id        uuid REFERENCES users(id) ON DELETE CASCADE,
  product_id     text,
  product_name   text,
  product_price  integer,
  product_image  text,
  product_url    text,
  source         text CHECK (source IN ('rakuten', 'yahoo', 'amazon')),
  created_at     timestamp DEFAULT now()
);

-- 4. chat_sessions（チャットセッション）
CREATE TABLE IF NOT EXISTS chat_sessions (
  id          uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id     uuid REFERENCES users(id) ON DELETE CASCADE,
  created_at  timestamp DEFAULT now()
);

-- 5. chat_messages（チャットメッセージ）
CREATE TABLE IF NOT EXISTS chat_messages (
  id          uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  session_id  uuid REFERENCES chat_sessions(id) ON DELETE CASCADE,
  role        text NOT NULL CHECK (role IN ('user', 'assistant')),
  content     text,
  products    jsonb DEFAULT '[]'::jsonb,
  created_at  timestamp DEFAULT now()
);

-- =====================================================
-- Row Level Security（RLS）有効化
-- =====================================================

ALTER TABLE users         ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorites      ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_sessions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages  ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS ポリシー（Clerk JWT の sub クレームで照合）
-- =====================================================

-- users
CREATE POLICY "自分のプロフィールを参照" ON users
  FOR SELECT USING (clerk_id = auth.jwt() ->> 'sub');

CREATE POLICY "自分のプロフィールを作成" ON users
  FOR INSERT WITH CHECK (clerk_id = auth.jwt() ->> 'sub');

CREATE POLICY "自分のプロフィールを更新" ON users
  FOR UPDATE USING (clerk_id = auth.jwt() ->> 'sub');

-- search_history
CREATE POLICY "自分の検索履歴を参照" ON search_history
  FOR SELECT USING (
    user_id = (SELECT id FROM users WHERE clerk_id = auth.jwt() ->> 'sub')
  );

CREATE POLICY "自分の検索履歴を追加" ON search_history
  FOR INSERT WITH CHECK (
    user_id = (SELECT id FROM users WHERE clerk_id = auth.jwt() ->> 'sub')
  );

CREATE POLICY "自分の検索履歴を削除" ON search_history
  FOR DELETE USING (
    user_id = (SELECT id FROM users WHERE clerk_id = auth.jwt() ->> 'sub')
  );

-- favorites
CREATE POLICY "自分のお気に入りを参照" ON favorites
  FOR SELECT USING (
    user_id = (SELECT id FROM users WHERE clerk_id = auth.jwt() ->> 'sub')
  );

CREATE POLICY "自分のお気に入りを追加" ON favorites
  FOR INSERT WITH CHECK (
    user_id = (SELECT id FROM users WHERE clerk_id = auth.jwt() ->> 'sub')
  );

CREATE POLICY "自分のお気に入りを削除" ON favorites
  FOR DELETE USING (
    user_id = (SELECT id FROM users WHERE clerk_id = auth.jwt() ->> 'sub')
  );

-- chat_sessions
CREATE POLICY "自分のチャットセッションを参照" ON chat_sessions
  FOR SELECT USING (
    user_id = (SELECT id FROM users WHERE clerk_id = auth.jwt() ->> 'sub')
  );

CREATE POLICY "自分のチャットセッションを作成" ON chat_sessions
  FOR INSERT WITH CHECK (
    user_id = (SELECT id FROM users WHERE clerk_id = auth.jwt() ->> 'sub')
  );

-- chat_messages
CREATE POLICY "自分のセッションのメッセージを参照" ON chat_messages
  FOR SELECT USING (
    session_id IN (
      SELECT id FROM chat_sessions
      WHERE user_id = (SELECT id FROM users WHERE clerk_id = auth.jwt() ->> 'sub')
    )
  );

CREATE POLICY "自分のセッションにメッセージを追加" ON chat_messages
  FOR INSERT WITH CHECK (
    session_id IN (
      SELECT id FROM chat_sessions
      WHERE user_id = (SELECT id FROM users WHERE clerk_id = auth.jwt() ->> 'sub')
    )
  );
