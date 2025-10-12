/**
 * 時間フォーマットユーティリティ
 * UI表示用の時間表現
 */

/**
 * 相対時間文字列を生成
 * 現在時刻からの経過時間を「○時間前」「○分前」形式で表示
 *
 * @param timestamp 過去のタイムスタンプ（ミリ秒）
 * @param currentTimestamp 現在のタイムスタンプ（ミリ秒）
 * @returns 相対時間文字列（例: "3時間前", "15分前", "30秒前"）
 */
export const formatTimeAgo = (timestamp: number, currentTimestamp: number): string => {
  const diff = currentTimestamp - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days}日前`;
  }
  if (hours > 0) {
    return `${hours}時間前`;
  }
  if (minutes > 0) {
    return `${minutes}分前`;
  }
  return `${seconds}秒前`;
};
