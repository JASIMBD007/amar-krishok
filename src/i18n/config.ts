import type { Language } from "../types";

export const DEFAULT_LOCALE: Language = "bn-BD";
export const FALLBACK_LOCALE: Language = "en";
export const SUPPORTED_LOCALES = [DEFAULT_LOCALE, FALLBACK_LOCALE] as const;

export function normalizeLocale(value: unknown): Language {
  return value === FALLBACK_LOCALE ? FALLBACK_LOCALE : DEFAULT_LOCALE;
}
