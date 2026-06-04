import type { Language } from "../types";

export function normalizeDateInput(value: string) {
  return value
    .trim()
    .replace(/[\u09E6-\u09EF]/g, (digit) => String(digit.charCodeAt(0) - 0x09e6))
    .replaceAll(".", "-")
    .replaceAll("/", "-");
}

export function formatLocalizedDate(
  value: string | null,
  language: Language,
  fallback: string,
  options: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" },
) {
  if (!value) {
    return fallback;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return fallback;
  }

  return new Intl.DateTimeFormat(language === "bn" ? "bn-BD" : "en", options).format(date);
}
