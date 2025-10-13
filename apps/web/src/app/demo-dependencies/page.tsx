/**
 * Dependency Visualization Demo Page
 * 依存関係可視化のデモページ
 */

'use client';

import { defaultOptions, type Utterance } from '@atlas/core';
import { useState } from 'react';
import { ConversationLayout } from '@/features/components';
import { useStream } from '@/features/hooks/useStream';

const SAMPLE_UTTERANCES: Array<Omit<Utterance, 'id'>> = [
  {
    text: '今日はB社向けデモの最終確認と資料更新について進めます。',
    timestamp: Date.now(),
    speaker: '司会',
  },
  {
    text: 'アジェンダはデモ構成、API v3の対応、価格プラン、発表者、日程変更です。',
    timestamp: Date.now() + 5000,
    speaker: '司会',
  },
  {
    text: 'まずデモの対象はB社で確定、英語デモで進めます。',
    timestamp: Date.now() + 10000,
    speaker: 'Aさん',
  },
  {
    text: '英語デモということで資料は英語版を基本にします。',
    timestamp: Date.now() + 15000,
    speaker: 'Bさん',
  },
  {
    text: 'B社の要望でトライアル期間を2週間つける案が出ています。',
    timestamp: Date.now() + 20000,
    speaker: 'Cさん',
  },
  {
    text: '日程は10/18予定から10/20に変更の打診がありました。',
    timestamp: Date.now() + 25000,
    speaker: '司会',
  },
  {
    text: '私は10/20でも問題ありません。',
    timestamp: Date.now() + 30000,
    speaker: 'Aさん',
  },
  {
    text: '発表者は中西さん想定ですがご都合どうでしょう？',
    timestamp: Date.now() + 35000,
    speaker: 'Bさん',
  },
  {
    text: 'はい、10/20の午前であれば対応可能です。',
    timestamp: Date.now() + 40000,
    speaker: 'Cさん',
  },
  {
    text: 'デモシナリオは導入→ダッシュボード→分析→エクスポートの順で。',
    timestamp: Date.now() + 45000,
    speaker: '司会',
  },
  {
    text: '英語スクリプトは私が叩き台を作成します。',
    timestamp: Date.now() + 50000,
    speaker: 'Aさん',
  },
  {
    text: 'B社のKPIは導入速度と初期設定の手間です。',
    timestamp: Date.now() + 55000,
    speaker: 'Cさん',
  },
  {
    text: '初期設定はテンプレートを配布し、5分で完了する流れを見せましょう。',
    timestamp: Date.now() + 60000,
    speaker: '司会',
  },
];

export default function DemoDependenciesPage() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const { dialogue, scores, addUtterance, clear, isAnalyzing } = useStream({
    analysisOptions: {
      ...defaultOptions,
      fdrAlpha: 0.1, // p < 0.1 で重要と判定
    },
  });

  const handleAddNext = async () => {
    if (currentIndex < SAMPLE_UTTERANCES.length) {
      const next = SAMPLE_UTTERANCES[currentIndex];
      await addUtterance({
        ...next,
        id: currentIndex + 1,
      });
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handleAddAll = async () => {
    for (let i = currentIndex; i < SAMPLE_UTTERANCES.length; i++) {
      const next = SAMPLE_UTTERANCES[i];
      await addUtterance({
        ...next,
        id: i + 1,
      });
      setCurrentIndex(i + 1);
    }
  };

  const handleReset = () => {
    clear();
    setCurrentIndex(0);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-8">
      <div className="max-w-7xl mx-auto">
        {/* ヘッダー */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">
            依存関係可視化デモ
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            会話の依存関係をリアルタイムで可視化します。重要な発話とその連鎖を確認できます。
          </p>
        </div>

        {/* コントロール */}
        <div className="mb-6 flex gap-4">
          <button
            type="button"
            onClick={handleAddNext}
            disabled={currentIndex >= SAMPLE_UTTERANCES.length || isAnalyzing}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition"
          >
            次の発話を追加 ({currentIndex + 1}/{SAMPLE_UTTERANCES.length})
          </button>

          <button
            type="button"
            onClick={handleAddAll}
            disabled={currentIndex >= SAMPLE_UTTERANCES.length || isAnalyzing}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition"
          >
            すべて追加
          </button>

          <button
            type="button"
            onClick={handleReset}
            disabled={isAnalyzing}
            className="px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition"
          >
            リセット
          </button>
        </div>

        {/* 統計 */}
        <div className="mb-6 grid grid-cols-3 gap-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-4">
            <div className="text-sm text-slate-600 dark:text-slate-400">総発話数</div>
            <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              {dialogue.length}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-4">
            <div className="text-sm text-slate-600 dark:text-slate-400">重要発話数</div>
            <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
              {Array.from(scores.values()).filter(s => s.isImportant).length}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-4">
            <div className="text-sm text-slate-600 dark:text-slate-400">重要度</div>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {dialogue.length > 0
                ? (
                    (Array.from(scores.values()).filter(s => s.isImportant).length /
                      dialogue.length) *
                    100
                  ).toFixed(1)
                : 0}
              %
            </div>
          </div>
        </div>

        {/* メインコンテンツ */}
        <ConversationLayout dialogue={dialogue} scores={scores} isAnalyzing={isAnalyzing} />

        {/* 使い方 */}
        <div className="mt-8 bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-3">使い方</h3>
          <ul className="space-y-2 text-sm text-blue-800 dark:text-blue-200">
            <li>• 「次の発話を追加」ボタンで1発話ずつ追加できます</li>
            <li>• 「すべて追加」ボタンで残りを一括追加できます</li>
            <li>• 重要な発話は ⭐ マークが付き、色で強調されます</li>
            <li>• 発話をクリックすると、前後の依存関係がハイライトされます</li>
            <li>• 右側のミニマップで連鎖を俯瞰できます</li>
            <li>• 矢印（↓）は依存関係を示し、ΔLoss と p値が表示されます</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
