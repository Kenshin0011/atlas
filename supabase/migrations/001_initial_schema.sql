-- Initial Schema
-- セッション、発話、スコア、依存関係を管理するテーブル

-- セッションテーブル
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id),
  username TEXT,
  notes TEXT,
  tags TEXT[],
  experiment_params JSONB
);

-- 発話テーブル
CREATE TABLE utterances (
  id BIGSERIAL PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  username TEXT,
  speaker TEXT NOT NULL,
  text TEXT NOT NULL,
  timestamp BIGINT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- スコアテーブル
CREATE TABLE scores (
  id BIGSERIAL PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  utterance_id BIGINT NOT NULL REFERENCES utterances(id) ON DELETE CASCADE,
  score JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- 同じ発話に対するスコアの重複を防ぐ
  UNIQUE(session_id, utterance_id)
);

-- 依存関係テーブル
CREATE TABLE dependencies (
  id BIGSERIAL PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  from_utterance_id BIGINT NOT NULL REFERENCES utterances(id) ON DELETE CASCADE,
  to_utterance_id BIGINT NOT NULL REFERENCES utterances(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- 同じ依存関係の重複を防ぐ
  UNIQUE(session_id, from_utterance_id, to_utterance_id)
);

-- インデックス作成
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_username ON sessions(username);
CREATE INDEX idx_sessions_created_at ON sessions(created_at);

CREATE INDEX idx_utterances_session_id ON utterances(session_id);
CREATE INDEX idx_utterances_user_id ON utterances(user_id);
CREATE INDEX idx_utterances_created_at ON utterances(created_at);

CREATE INDEX idx_scores_session_id ON scores(session_id);
CREATE INDEX idx_scores_utterance_id ON scores(utterance_id);

CREATE INDEX idx_dependencies_session_id ON dependencies(session_id);
CREATE INDEX idx_dependencies_from_utterance_id ON dependencies(from_utterance_id);
CREATE INDEX idx_dependencies_to_utterance_id ON dependencies(to_utterance_id);

-- Row Level Security (RLS) を有効化
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE utterances ENABLE ROW LEVEL SECURITY;
ALTER TABLE scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE dependencies ENABLE ROW LEVEL SECURITY;

-- ポリシー: sessions
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

-- ポリシー: utterances
CREATE POLICY "Anyone can view utterances"
  ON utterances FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert their own utterances"
  ON utterances FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND speaker = username
  );

-- ポリシー: scores
CREATE POLICY "Anyone can view scores"
  ON scores FOR SELECT
  USING (true);

CREATE POLICY "Session owners can insert scores"
  ON scores FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM sessions
      WHERE sessions.id = scores.session_id
      AND sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Session owners can update scores"
  ON scores FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM sessions
      WHERE sessions.id = scores.session_id
      AND sessions.user_id = auth.uid()
    )
  );

-- ポリシー: dependencies
CREATE POLICY "Anyone can view dependencies"
  ON dependencies FOR SELECT
  USING (true);

CREATE POLICY "Session owners can insert dependencies"
  ON dependencies FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM sessions
      WHERE sessions.id = dependencies.session_id
      AND sessions.user_id = auth.uid()
    )
  );

-- リアルタイム購読を有効化
ALTER PUBLICATION supabase_realtime ADD TABLE utterances;
ALTER PUBLICATION supabase_realtime ADD TABLE scores;
ALTER PUBLICATION supabase_realtime ADD TABLE dependencies;
