/**
 * SessionsManager Component
 * セッション一覧・統計・フィルタリング・エクスポート
 */

'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  clearSessionDataAction,
  deleteSessionAction,
  exportSessionsAction,
  getSessionsAction,
  getSessionUtterancesAction,
} from '@/app/actions/session';

type Session = {
  id: string;
  created_at: string;
  username: string | null;
  notes: string | null;
  experiment_params: unknown;
  utterance_count: number;
  important_count: number;
  avg_score: number;
};

type Utterance = {
  id: number;
  speaker: string;
  text: string;
  timestamp: number;
};

export const SessionsManager = () => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterUser, setFilterUser] = useState<string>('');
  const [sortBy, setSortBy] = useState<'date' | 'utterances' | 'important' | 'score'>('date');
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null);
  const [utterances, setUtterances] = useState<Utterance[]>([]);
  const [loadingUtterances, setLoadingUtterances] = useState(false);

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    try {
      const sessions = await getSessionsAction();
      setSessions(
        sessions.map(s => ({
          id: s.id,
          created_at: s.createdAt,
          username: s.username,
          notes: s.notes || null,
          experiment_params: s.experimentParams,
          utterance_count: s.utteranceCount,
          important_count: s.importantCount,
          avg_score: s.avgScore,
        }))
      );
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
    try {
      const data = await exportSessionsAction(format);
      const blob = new Blob([data], {
        type: format === 'csv' ? 'text/csv' : 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sessions-${new Date().toISOString()}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
      alert('エクスポートに失敗しました');
    }
  };

  const handleClearSession = async (sessionId: string) => {
    if (!confirm('この会話の履歴をリセットしますか？（セッションは保持されます）')) {
      return;
    }

    try {
      await clearSessionDataAction(sessionId);
      alert('履歴をリセットしました');
      fetchSessions();
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '不明なエラー';
      alert(`履歴のリセットに失敗しました: ${errorMsg}`);
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    if (
      !confirm(
        'このセッションを完全に削除しますか？\n（セッション情報・発話・スコアすべてが削除されます）'
      )
    ) {
      return;
    }

    try {
      await deleteSessionAction(sessionId);
      alert('セッションを削除しました');
      fetchSessions();
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '不明なエラー';
      alert(`セッションの削除に失敗しました: ${errorMsg}`);
    }
  };

  const handleToggleExpand = async (sessionId: string) => {
    if (expandedSessionId === sessionId) {
      // 閉じる
      setExpandedSessionId(null);
      setUtterances([]);
      return;
    }

    // 開く
    setExpandedSessionId(sessionId);
    setLoadingUtterances(true);

    try {
      const utterances = await getSessionUtterancesAction(sessionId);
      setUtterances(utterances);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '不明なエラー';
      alert(`発話の取得に失敗しました: ${errorMsg}`);
      setExpandedSessionId(null);
    } finally {
      setLoadingUtterances(false);
    }
  };

  const filteredSessions = sessions
    .filter(s => {
      if (filterUser && !s.username?.includes(filterUser)) return false;
      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'utterances':
          return b.utterance_count - a.utterance_count;
        case 'important':
          return b.important_count - a.important_count;
        case 'score':
          return (b.avg_score ?? 0) - (a.avg_score ?? 0);
        default:
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });

  // 統計サマリー
  const totalUtterances = sessions.reduce((sum, s) => sum + s.utterance_count, 0);
  const totalImportant = sessions.reduce((sum, s) => sum + s.important_count, 0);
  const avgScore =
    sessions.length > 0
      ? sessions.reduce((sum, s) => sum + (s.avg_score ?? 0), 0) / sessions.length
      : 0;

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
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 dark:text-slate-400 uppercase w-8"></th>
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
                  UIモード
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
              {filteredSessions.map(session => {
                const isExpanded = expandedSessionId === session.id;
                const uiMode =
                  (session.experiment_params as { uiMode?: 'alpha' | 'beta' })?.uiMode || 'alpha';
                return (
                  <React.Fragment key={session.id}>
                    <tr className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => handleToggleExpand(session.id)}
                          className="text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                        >
                          {isExpanded ? '▼' : '▶'}
                        </button>
                      </td>
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
                        <span
                          className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                            uiMode === 'beta'
                              ? 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200'
                              : 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200'
                          }`}
                        >
                          {uiMode === 'beta' ? 'β' : 'α'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-slate-800 dark:text-slate-200">
                        {session.utterance_count}
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-green-600 dark:text-green-400 font-medium">
                        {session.important_count}
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-purple-600 dark:text-purple-400 font-medium">
                        {(session.avg_score ?? 0).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-sm text-center">
                        <div className="flex items-center justify-center gap-2">
                          <a
                            href={`/debug?session=${session.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 underline text-xs"
                          >
                            表示
                          </a>
                          {session.utterance_count > 0 && (
                            <button
                              type="button"
                              onClick={() => handleClearSession(session.id)}
                              className="text-orange-600 hover:text-orange-700 dark:text-orange-400 dark:hover:text-orange-300 underline text-xs"
                            >
                              リセット
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleDeleteSession(session.id)}
                            className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 underline text-xs"
                          >
                            削除
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* 展開された発話リスト */}
                    {isExpanded && (
                      <tr>
                        <td colSpan={9} className="px-4 py-4 bg-slate-50 dark:bg-slate-900/50">
                          {loadingUtterances ? (
                            <div className="text-center text-slate-500 dark:text-slate-400 py-4">
                              読み込み中...
                            </div>
                          ) : utterances.length === 0 ? (
                            <div className="text-center text-slate-500 dark:text-slate-400 py-4">
                              発話がありません
                            </div>
                          ) : (
                            <div className="max-h-96 overflow-y-auto">
                              <table className="w-full">
                                <thead className="bg-slate-100 dark:bg-slate-800 sticky top-0">
                                  <tr>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-slate-600 dark:text-slate-400">
                                      ID
                                    </th>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-slate-600 dark:text-slate-400">
                                      話者
                                    </th>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-slate-600 dark:text-slate-400">
                                      発話内容
                                    </th>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-slate-600 dark:text-slate-400">
                                      時刻
                                    </th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                  {utterances.map((utt, index) => (
                                    <tr key={utt.id}>
                                      <td className="px-3 py-2 text-xs text-slate-600 dark:text-slate-400">
                                        #{index + 1}
                                      </td>
                                      <td className="px-3 py-2 text-xs text-slate-700 dark:text-slate-300 font-medium">
                                        {utt.speaker}
                                      </td>
                                      <td className="px-3 py-2 text-sm text-slate-800 dark:text-slate-200">
                                        {utt.text}
                                      </td>
                                      <td className="px-3 py-2 text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                                        {new Date(utt.timestamp).toLocaleString('ja-JP')}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
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
