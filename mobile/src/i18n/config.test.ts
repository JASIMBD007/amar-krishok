import { describe, expect, it } from "vitest";

import {
  defaultLocale,
  defaultLocaleSettings,
  fallbackLocale,
  i18next,
} from "./config";

describe("mobile localisation", () => {
  it("starts in Bengali with English configured as the fallback", () => {
    expect(defaultLocale).toBe("bn-BD");
    expect(defaultLocaleSettings).toEqual({
      locale: "bn-BD",
      showEnglishGloss: false,
    });
    expect(i18next.isInitialized).toBe(true);
    expect(i18next.language).toBe(defaultLocale);
    expect(i18next.options.fallbackLng).toEqual([fallbackLocale]);
  });

  it("provides Bengali-first foundation copy", () => {
    expect(i18next.t("foundation.title", { lng: defaultLocale })).toBe("মোবাইল অ্যাপ প্রস্তুত");
    expect(i18next.t("foundation.title", { lng: fallbackLocale })).toBe("Mobile app ready");
  });
});
