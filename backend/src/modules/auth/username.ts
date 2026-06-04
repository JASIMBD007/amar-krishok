export function normalizeUsername(value: string) {
  return value.trim().toLowerCase();
}

export function isUsernameFormatValid(value: string) {
  return /^[a-zA-Z0-9._-]{3,32}$/.test(value.trim());
}
