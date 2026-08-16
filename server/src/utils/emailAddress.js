/** Normalize email addresses consistently across all authentication flows. */
export function normalizeEmail(email) {
  return String(email ?? '')
    .trim()
    .toLowerCase()
}
