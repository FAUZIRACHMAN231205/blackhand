// Admin helper untuk check authorization

const ADMIN_EMAILS = [
  'manyungalang@gmail.com',
  'fauzirachman10091985@gmail.com'
];

/**
 * Check apakah user adalah admin
 * @param userEmail - Email dari authenticated user
 * @returns true jika user adalah admin
 */
export function isAdmin(userEmail: string | undefined): boolean {
  if (!userEmail) return false;
  return ADMIN_EMAILS.includes(userEmail.toLowerCase());
}

/**
 * Get admin email list
 */
export function getAdminEmails(): string[] {
  return ADMIN_EMAILS;
}
