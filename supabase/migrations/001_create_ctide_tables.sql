-- CTIDE Session Storage Schema
-- 会話セッション、発話、スコアを保存するテーブル

-- セッションテーブル
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id),
  username TEXT
);

-- 発話テーブル
CREATE TABLE IF NOT EXISTS utterances (
  id BIGSERIAL PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  username TEXT,
  speaker TEXT NOT NULL,
  text TEXT NOT NULL,
  timestamp BIGINT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- CTIDEスコアテーブル
CREATE TABLE IF NOT EXISTS ctide_scores (
  id BIGSERIAL PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  utterance_id BIGINT NOT NULL,
  score JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_username ON sessions(username);
CREATE INDEX IF NOT EXISTS idx_utterances_session_id ON utterances(session_id);
CREATE INDEX IF NOT EXISTS idx_utterances_user_id ON utterances(user_id);
CREATE INDEX IF NOT EXISTS idx_utterances_created_at ON utterances(created_at);
CREATE INDEX IF NOT EXISTS idx_ctide_scores_session_id ON ctide_scores(session_id);
CREATE INDEX IF NOT EXISTS idx_ctide_scores_utterance_id ON ctide_scores(utterance_id);

-- Row Level Security (RLS) を有効化
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE utterances ENABLE ROW LEVEL SECURITY;
ALTER TABLE ctide_scores ENABLE ROW LEVEL SECURITY;

-- ポリシー：
-- - 誰でも全てのセッションを閲覧可能（URLで共有可能）
-- - ログインユーザーのみセッション作成可能
-- - 自分のセッションのみ更新・削除可能

-- sessions
CREATE POLICY "Anyone can view sessions"
  ON sessions FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create sessions"
  ON sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sessions"
  ON sessions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sessions"
  ON sessions FOR DELETE
  USING (auth.uid() = user_id);

-- utterances (誰でも読み取り可能、認証済みユーザーは自分の発話を追加可能)
CREATE POLICY "Anyone can view utterances"
  ON utterances FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert their own utterances"
  ON utterances FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND speaker = username
  );

-- ctide_scores (誰でも読み取り可能、セッションオーナーのみ追加可能)
CREATE POLICY "Anyone can view ctide_scores"
  ON ctide_scores FOR SELECT
  USING (true);

CREATE POLICY "Session owners can insert ctide_scores"
  ON ctide_scores FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM sessions
      WHERE sessions.id = ctide_scores.session_id
      AND sessions.user_id = auth.uid()
    )
  );

-- リアルタイム購読を有効化
ALTER PUBLICATION supabase_realtime ADD TABLE utterances;
ALTER PUBLICATION supabase_realtime ADD TABLE ctide_scores;
