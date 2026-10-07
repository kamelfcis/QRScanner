export const STAFF_USERNAME_PATTERN = /^[a-z0-9._-]{3,32}$/;

export const LOGIN_EMAIL_PATTERN = /^[^@]+@[^@]+\.[^@]+$/;

export function normalizeStaffUsername(raw: string): string | null {
  const trimmed = raw.trim().toLowerCase();
  return trimmed === '' ? null : trimmed;
}

export function isValidStaffUsername(username: string): boolean {
  return STAFF_USERNAME_PATTERN.test(username);
}

export function isLoginIdentifier(value: string): boolean {
  const trimmed = value.trim();
  return LOGIN_EMAIL_PATTERN.test(trimmed) || STAFF_USERNAME_PATTERN.test(trimmed.toLowerCase());
}
