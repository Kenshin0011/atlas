-- セッションメタデータの追加
-- 実験条件、タグ、メモを記録

-- sessions テーブルに実験用カラムを追加
ALTER TABLE sessions ADD COLUMN tags TEXT[];
ALTER TABLE sessions ADD COLUMN notes TEXT;
ALTER TABLE sessions ADD COLUMN experiment_params JSONB;

-- 統計用のカラム（集計を高速化）
ALTER TABLE sessions ADD COLUMN utterance_count INTEGER DEFAULT 0;
ALTER TABLE sessions ADD COLUMN important_count INTEGER DEFAULT 0;
ALTER TABLE sessions ADD COLUMN avg_score NUMERIC DEFAULT 0;
ALTER TABLE sessions ADD COLUMN duration_seconds INTEGER;

-- インデックス追加
CREATE INDEX IF NOT EXISTS idx_sessions_tags ON sessions USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_sessions_created_at ON sessions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_utterance_count ON sessions(utterance_count);
CREATE INDEX IF NOT EXISTS idx_sessions_important_count ON sessions(important_count);

-- 統計情報を自動更新する関数
CREATE OR REPLACE FUNCTION update_session_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- utterance_count を更新
  UPDATE sessions
  SET utterance_count = (
    SELECT COUNT(*) FROM utterances WHERE session_id = NEW.session_id
  )
  WHERE id = NEW.session_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- トリガー: utterances 追加時に統計を更新
CREATE TRIGGER trigger_update_session_stats_on_utterance
AFTER INSERT ON utterances
FOR EACH ROW
EXECUTE FUNCTION update_session_stats();

-- important_count と avg_score を更新する関数
CREATE OR REPLACE FUNCTION update_session_ctide_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- important_count と avg_score を更新
  UPDATE sessions
  SET
    important_count = (
      SELECT COUNT(*)
      FROM ctide_scores
      WHERE session_id = NEW.session_id
        AND (score->>'isImportant')::boolean = true
    ),
    avg_score = (
      SELECT AVG((score->>'score')::numeric)
      FROM ctide_scores
      WHERE session_id = NEW.session_id
    )
  WHERE id = NEW.session_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- トリガー: ctide_scores 追加時に統計を更新
CREATE TRIGGER trigger_update_session_stats_on_score
AFTER INSERT ON ctide_scores
FOR EACH ROW
EXECUTE FUNCTION update_session_ctide_stats();

-- 統計ビュー（修正版: username を使用）
CREATE OR REPLACE VIEW session_statistics AS
SELECT
  s.id,
  s.created_at,
  s.username,
  s.tags,
  s.notes,
  s.experiment_params,
  s.utterance_count,
  s.important_count,
  s.avg_score,
  CASE
    WHEN s.utterance_count > 0 THEN
      EXTRACT(EPOCH FROM (
        (SELECT MAX(created_at) FROM utterances WHERE session_id = s.id) -
        (SELECT MIN(created_at) FROM utterances WHERE session_id = s.id)
      ))::integer
    ELSE 0
  END as duration_seconds,
  (SELECT COUNT(*) FROM utterances WHERE session_id = s.id) as actual_utterance_count,
  (SELECT json_agg(json_build_object(
    'score', (score->>'score')::numeric,
    'pValue', (score->>'pValue')::numeric,
    'isImportant', (score->>'isImportant')::boolean
  )) FROM ctide_scores WHERE session_id = s.id) as score_distribution
FROM sessions s;

COMMENT ON VIEW session_statistics IS '実験データ集計用の統計ビュー';
