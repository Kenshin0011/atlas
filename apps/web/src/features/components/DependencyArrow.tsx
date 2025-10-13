/**
 * DependencyArrow Component
 * 発話間の依存関係を矢印で表示
 */

'use client';

type DependencyArrowProps = {
  deltaLoss: number;
  pValue: number;
  direction: 'up' | 'down';
};

export const DependencyArrow = ({ deltaLoss, pValue, direction }: DependencyArrowProps) => {
  // 重要度に応じた色
  const color = pValue < 0.05 ? 'text-red-500' : pValue < 0.1 ? 'text-orange-500' : 'text-gray-400';

  // 太さ（deltaLossに応じて）
  const thickness =
    deltaLoss > 0.07 ? 'stroke-[3]' : deltaLoss > 0.04 ? 'stroke-[2]' : 'stroke-[1]';

  return (
    <div className={`flex items-center gap-2 text-xs ${color}`}>
      {direction === 'up' ? (
        <svg
          className={`w-4 h-4 ${thickness}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          role="img"
          aria-label="依存元へ"
        >
          <title>依存元へ</title>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
        </svg>
      ) : (
        <svg
          className={`w-4 h-4 ${thickness}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          role="img"
          aria-label="依存先へ"
        >
          <title>依存先へ</title>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
        </svg>
      )}
      <span className="font-mono">
        Δ={deltaLoss.toFixed(3)} <span className="opacity-70">p={pValue.toFixed(3)}</span>
      </span>
    </div>
  );
};
