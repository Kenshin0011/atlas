/**
 * DebugParameterControl Component
 * パラメータのリアルタイム調整UI
 */

'use client';

import { useState } from 'react';

type CtideParameters = {
  k: number;
  alphaMix: number;
  halfLifeTurns: number;
  nullSamples: number;
  fdrAlpha: number;
  mmrLambda: number;
};

type DebugParameterControlProps = {
  currentParams: CtideParameters;
  onParamsChange?: (params: CtideParameters) => void;
};

const DEFAULT_PARAMS: CtideParameters = {
  k: 6,
  alphaMix: 0.6,
  halfLifeTurns: 20,
  nullSamples: 8,
  fdrAlpha: 0.1,
  mmrLambda: 0.7,
};

export const DebugParameterControl = ({
  currentParams,
  onParamsChange,
}: DebugParameterControlProps) => {
  const [params, setParams] = useState<CtideParameters>(currentParams);
  const [isExpanded, setIsExpanded] = useState(false);

  const handleChange = (key: keyof CtideParameters, value: number) => {
    const newParams = { ...params, [key]: value };
    setParams(newParams);
    onParamsChange?.(newParams);
  };

  const handleReset = () => {
    setParams(DEFAULT_PARAMS);
    onParamsChange?.(DEFAULT_PARAMS);
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
          ⚙️ パラメータ制御
        </h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleReset}
            className="text-xs px-3 py-1 bg-slate-600 hover:bg-slate-700 text-white rounded transition-colors"
          >
            リセット
          </button>
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-xs px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
          >
            {isExpanded ? '折りたたむ' : '展開'}
          </button>
        </div>
      </div>

      {/* 現在の設定（常に表示） */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
        <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded">
          <div className="text-xs text-slate-500 dark:text-slate-400">ウィンドウサイズ (k)</div>
          <div className="text-lg font-bold text-slate-800 dark:text-slate-100">{params.k}</div>
        </div>
        <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded">
          <div className="text-xs text-slate-500 dark:text-slate-400">混合比 (α)</div>
          <div className="text-lg font-bold text-slate-800 dark:text-slate-100">
            {params.alphaMix.toFixed(2)}
          </div>
        </div>
        <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded">
          <div className="text-xs text-slate-500 dark:text-slate-400">FDR閾値</div>
          <div className="text-lg font-bold text-slate-800 dark:text-slate-100">
            {params.fdrAlpha.toFixed(2)}
          </div>
        </div>
      </div>

      {/* 詳細設定（展開時のみ） */}
      {isExpanded && (
        <div className="space-y-4 border-t border-slate-200 dark:border-slate-700 pt-4">
          {/* k: ウィンドウサイズ */}
          <div>
            <div className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              <span className="font-mono">k</span> - 直近評価ウィンドウ: {params.k}
            </div>
            <input
              type="range"
              min="3"
              max="20"
              step="1"
              value={params.k}
              onChange={e => handleChange('k', Number.parseInt(e.target.value, 10))}
              className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 mt-1">
              <span>3</span>
              <span>20</span>
            </div>
          </div>

          {/* alphaMix: 損失/サプライザル混合比 */}
          <div>
            <div className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              <span className="font-mono">alphaMix</span> - 損失/サプライザル混合:{' '}
              {params.alphaMix.toFixed(2)}
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={params.alphaMix}
              onChange={e => handleChange('alphaMix', Number.parseFloat(e.target.value))}
              className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 mt-1">
              <span>0.0</span>
              <span>1.0</span>
            </div>
          </div>

          {/* halfLifeTurns: 時間減衰半減期 */}
          <div>
            <div className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              <span className="font-mono">halfLifeTurns</span> - 時間減衰半減期:{' '}
              {params.halfLifeTurns} 発話
            </div>
            <input
              type="range"
              min="5"
              max="50"
              step="1"
              value={params.halfLifeTurns}
              onChange={e => handleChange('halfLifeTurns', Number.parseInt(e.target.value, 10))}
              className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 mt-1">
              <span>5</span>
              <span>50</span>
            </div>
          </div>

          {/* nullSamples: 帰無サンプル数 */}
          <div>
            <div className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              <span className="font-mono">nullSamples</span> - 帰無分布サンプル数:{' '}
              {params.nullSamples}
            </div>
            <input
              type="range"
              min="5"
              max="20"
              step="1"
              value={params.nullSamples}
              onChange={e => handleChange('nullSamples', Number.parseInt(e.target.value, 10))}
              className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 mt-1">
              <span>5</span>
              <span>20</span>
            </div>
          </div>

          {/* fdrAlpha: FDR閾値 */}
          <div>
            <div className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              <span className="font-mono">fdrAlpha</span> - BH-FDR閾値: {params.fdrAlpha.toFixed(2)}
            </div>
            <input
              type="range"
              min="0.01"
              max="0.2"
              step="0.01"
              value={params.fdrAlpha}
              onChange={e => handleChange('fdrAlpha', Number.parseFloat(e.target.value))}
              className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 mt-1">
              <span>0.01</span>
              <span>0.20</span>
            </div>
          </div>

          {/* mmrLambda: MMR多様化強度 */}
          <div>
            <div className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              <span className="font-mono">mmrLambda</span> - MMR多様化強度:{' '}
              {params.mmrLambda.toFixed(2)}
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={params.mmrLambda}
              onChange={e => handleChange('mmrLambda', Number.parseFloat(e.target.value))}
              className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 mt-1">
              <span>0.0</span>
              <span>1.0</span>
            </div>
          </div>
        </div>
      )}

      {/* パラメータ説明 */}
      {isExpanded && (
        <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded text-xs text-slate-600 dark:text-slate-400">
          <h4 className="font-semibold mb-2">パラメータ説明</h4>
          <ul className="space-y-1 list-disc list-inside">
            <li>
              <span className="font-mono">k</span>: 直近k発話を厳密評価する範囲
            </li>
            <li>
              <span className="font-mono">alphaMix</span>:
              損失とサプライザルの混合比（0=サプライザルのみ、1=損失のみ）
            </li>
            <li>
              <span className="font-mono">halfLifeTurns</span>: 何発話で重要度が半減するか
            </li>
            <li>
              <span className="font-mono">nullSamples</span>: 統計的有意性検定用の帰無サンプル数
            </li>
            <li>
              <span className="font-mono">fdrAlpha</span>: Benjamini-Hochberg FDR制御の有意水準
            </li>
            <li>
              <span className="font-mono">mmrLambda</span>:
              MMR多様化の関連度vs多様度バランス（0=多様度重視、1=関連度重視）
            </li>
          </ul>
        </div>
      )}
    </div>
  );
};
