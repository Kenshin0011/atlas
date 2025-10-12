/**
 * Username utilities
 * メールアドレス形式からユーザー名を抽出
 */

/**
 * メールアドレスからユーザー名を抽出
 */
export const emailToUsername = (email: string): string => {
  // 複数のドメインパターンに対応
  return email.replace(/@.*$/, '');
};

/**
 * ユーザー名をメールアドレス形式に変換
 */
export const usernameToEmail = (username: string): string => {
  // 環境変数でドメインを設定可能に（デフォルトは test.com）
  // NOTE: Supabase で "Confirm email" を無効化する必要があります
  const domain = process.env.NEXT_PUBLIC_USERNAME_DOMAIN || 'test.com';
  return `${username}@${domain}`;
};
