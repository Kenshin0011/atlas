/**
 * SessionsManager Component
 * セッション一覧・統計・フィルタリング・エクスポート
 */

'use client';

import { useCallback, useEffect, useState } from 'react';

type Session = {
  id: string;
  created_at: string;
  username: string | null;
  tags: string[] | null;
  notes: string | null;
  experiment_params: unknown;
  utterance_count: number;
  important_count: number;
  avg_score: number;
};

export const SessionsManager = () => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterUser, setFilterUser] = useState<string>('');
  const [filterTag, setFilterTag] = useState<string>('');
  const [sortBy, setSortBy] = useState<'date' | 'utterances' | 'important' | 'score'>('date');

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/sessions');
      const data = await response.json();
      setSessions(data.sessions || []);
    } catch (error) {
      console.error('Failed to fetch sessions:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const handleExport = async (format: 'json' | 'csv') => {
    const url = `/api/sessions/export?format=${format}`;
    window.open(url, '_blank');
  };

  const filteredSessions = sessions
    .filter(s => {
      if (filterUser && !s.username?.includes(filterUser)) return false;
      if (filterTag && !s.tags?.some(t => t.includes(filterTag))) return false;
      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'utterances':
          return b.utterance_count - a.utterance_count;
        case 'important':
          return b.important_count - a.important_count;
        case 'score':
          return b.avg_score - a.avg_score;
        default:
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });

  // 統計サマリー
  const totalUtterances = sessions.reduce((sum, s) => sum + s.utterance_count, 0);
  const totalImportant = sessions.reduce((sum, s) => sum + s.important_count, 0);
  const avgScore =
    sessions.length > 0 ? sessions.reduce((sum, s) => sum + s.avg_score, 0) / sessions.length : 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 dark:bg-slate-900 flex items-center justify-center">
        <div className="text-slate-600 dark:text-slate-400">読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900">
      {/* ヘッダー */}
      <header className="bg-white dark:bg-slate-800 shadow-sm border-b border-slate-200 dark:border-slate-700">
        <div className="container mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
            📊 セッション管理
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            実験データの一覧・統計・エクスポート
          </p>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        {/* 統計サマリー */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-4">
            <div className="text-sm text-slate-600 dark:text-slate-400">総セッション数</div>
            <div className="text-3xl font-bold text-slate-800 dark:text-slate-100">
              {sessions.length}
            </div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-4">
            <div className="text-sm text-slate-600 dark:text-slate-400">総発話数</div>
            <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
              {totalUtterances}
            </div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-4">
            <div className="text-sm text-slate-600 dark:text-slate-400">総重要発言数</div>
            <div className="text-3xl font-bold text-green-600 dark:text-green-400">
              {totalImportant}
            </div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-4">
            <div className="text-sm text-slate-600 dark:text-slate-400">平均スコア</div>
            <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">
              {avgScore.toFixed(2)}
            </div>
          </div>
        </div>

        {/* コントロール */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-4 mb-6">
          <div className="flex flex-wrap items-center gap-4">
            {/* フィルター */}
            <input
              type="text"
              placeholder="ユーザーでフィルタ"
              value={filterUser}
              onChange={e => setFilterUser(e.target.value)}
              className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-slate-100"
            />
            <input
              type="text"
              placeholder="タグでフィルタ"
              value={filterTag}
              onChange={e => setFilterTag(e.target.value)}
              className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-slate-100"
            />

            {/* ソート */}
            <select
              value={sortBy}
              onChange={e =>
                setSortBy(e.target.value as 'date' | 'utterances' | 'important' | 'score')
              }
              className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-slate-100"
            >
              <option value="date">作成日時順</option>
              <option value="utterances">発話数順</option>
              <option value="important">重要発言数順</option>
              <option value="score">平均スコア順</option>
            </select>

            {/* エクスポート */}
            <div className="ml-auto flex gap-2">
              <button
                type="button"
                onClick={() => handleExport('json')}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                JSON出力
              </button>
              <button
                type="button"
                onClick={() => handleExport('csv')}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
              >
                CSV出力
              </button>
            </div>
          </div>
        </div>

        {/* セッション一覧 */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50 dark:bg-slate-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 dark:text-slate-400 uppercase">
                  作成日時
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 dark:text-slate-400 uppercase">
                  ブース名
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 dark:text-slate-400 uppercase">
                  ユーザー
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 dark:text-slate-400 uppercase">
                  タグ
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-600 dark:text-slate-400 uppercase">
                  発話数
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-600 dark:text-slate-400 uppercase">
                  重要発言
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-600 dark:text-slate-400 uppercase">
                  平均スコア
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-slate-600 dark:text-slate-400 uppercase">
                  アクション
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {filteredSessions.map(session => (
                <tr key={session.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                  <td className="px-4 py-3 text-sm text-slate-800 dark:text-slate-200">
                    {new Date(session.created_at).toLocaleString('ja-JP')}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-800 dark:text-slate-200 font-medium">
                    {session.notes || '(未設定)'}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">
                    {session.username || '匿名'}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {session.tags?.map(tag => (
                      <span
                        key={tag}
                        className="inline-block bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs px-2 py-1 rounded mr-1"
                      >
                        {tag}
                      </span>
                    ))}
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-slate-800 dark:text-slate-200">
                    {session.utterance_count}
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-green-600 dark:text-green-400 font-medium">
                    {session.important_count}
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-purple-600 dark:text-purple-400 font-medium">
                    {session.avg_score.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-sm text-center">
                    <a
                      href={`/debug?session=${session.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 underline"
                    >
                      表示
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredSessions.length === 0 && (
            <div className="p-8 text-center text-slate-500 dark:text-slate-400">
              セッションがありません
            </div>
          )}
        </div>
      </main>
    </div>
  );
};
