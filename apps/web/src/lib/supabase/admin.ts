/**
 * Admin Access Control
 * Defines which users have admin privileges
 */

/**
 * Check if a username has admin privileges
 */
export const isAdmin = (username: string | null): boolean => {
  if (!username) return false;

  // Admin usernames from environment variable (comma-separated)
  const adminUsernamesEnv = process.env.NEXT_PUBLIC_ADMIN_USERNAMES || '';
  const adminUsernames = adminUsernamesEnv
    .split(',')
    .map(u => u.trim())
    .filter(Boolean);

  // Fallback: if no env var set, use default admin username
  if (adminUsernames.length === 0) {
    return username === 'admin';
  }

  return adminUsernames.includes(username);
};

/**
 * Get list of admin usernames
 */
export const getAdminUsernames = (): string[] => {
  const adminUsernamesEnv = process.env.NEXT_PUBLIC_ADMIN_USERNAMES || '';
  const adminUsernames = adminUsernamesEnv
    .split(',')
    .map(u => u.trim())
    .filter(Boolean);

  if (adminUsernames.length === 0) {
    return ['admin'];
  }

  return adminUsernames;
};
