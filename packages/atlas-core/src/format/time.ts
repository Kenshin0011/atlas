/**
 * Time formatting utilities
 */

/**
 * Calculate time ago string
 * @param timestamp - The past timestamp in milliseconds.
 * @param currentTimestamp - The current timestamp in milliseconds.
 * @returns A string representing how long ago the timestamp was.
 */
export const formatTimeAgo = (timestamp: number, currentTimestamp: number): string => {
  const diff = currentTimestamp - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}時間前`;
  }
  if (minutes > 0) {
    return `${minutes}分前`;
  }
  return `${seconds}秒前`;
};
