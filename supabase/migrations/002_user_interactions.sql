-- User Interactions Table
-- ユーザーのインタラクション（ボタンクリックなど）を記録するテーブル

CREATE TABLE user_interactions (
  id BIGSERIAL PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  event_type TEXT NOT NULL, -- 'filter_toggle', 'summarize'
  event_data JSONB, -- 追加情報（例：filter_state: 'relevant' or 'all'）
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックス作成
CREATE INDEX idx_user_interactions_session_id ON user_interactions(session_id);
CREATE INDEX idx_user_interactions_user_id ON user_interactions(user_id);
CREATE INDEX idx_user_interactions_event_type ON user_interactions(event_type);
CREATE INDEX idx_user_interactions_created_at ON user_interactions(created_at);

-- Row Level Security (RLS) を有効化
ALTER TABLE user_interactions ENABLE ROW LEVEL SECURITY;

-- ポリシー: user_interactions
CREATE POLICY "Anyone can view user_interactions"
  ON user_interactions FOR SELECT
  USING (true);

CREATE POLICY "Session owners can insert user_interactions"
  ON user_interactions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM sessions
      WHERE sessions.id = user_interactions.session_id
      AND sessions.user_id = auth.uid()
    )
  );
