import { createInstance } from "i18next";
import { initReactI18next } from "react-i18next";

import { bnBD } from "./resources/bn-BD";
import { en } from "./resources/en";

export const defaultLocale = "bn-BD" as const;
export const fallbackLocale = "en" as const;
export type AppLocale = typeof defaultLocale | typeof fallbackLocale;

export type LocaleSettings = {
  locale: AppLocale;
  showEnglishGloss: boolean;
};

export const defaultLocaleSettings: LocaleSettings = {
  locale: defaultLocale,
  showEnglishGloss: false,
};

const resources = {
  "bn-BD": { translation: bnBD },
  en: { translation: en },
} as const;

const i18next = createInstance();

void i18next.use(initReactI18next).init({
  compatibilityJSON: "v4",
  fallbackLng: fallbackLocale,
  initAsync: false,
  interpolation: {
    escapeValue: false,
  },
  lng: defaultLocale,
  load: "currentOnly",
  resources,
  returnNull: false,
  supportedLngs: [defaultLocale, fallbackLocale],
});

export { i18next };
