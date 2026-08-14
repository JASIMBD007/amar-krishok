export type CookieConsent = {
  analytics: boolean;
  version: 1;
};

const COOKIE_NAME = "ak_cookie_consent";
const ONE_YEAR_SECONDS = 31_536_000;

export const COOKIE_CONSENT_CHANGE_EVENT = "amar-krishok:cookie-consent-change";
export const COOKIE_PREFERENCES_OPEN_EVENT = "amar-krishok:cookie-preferences-open";

export function readCookieConsent(): CookieConsent | null {
  if (typeof document === "undefined") {
    return null;
  }

  const entry = document.cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${COOKIE_NAME}=`));

  if (!entry) {
    return null;
  }

  const value = decodeURIComponent(entry.slice(COOKIE_NAME.length + 1));
  if (value === "v1-analytics") {
    return { analytics: true, version: 1 };
  }
  if (value === "v1-necessary") {
    return { analytics: false, version: 1 };
  }

  return null;
}

export function hasAnalyticsConsent() {
  return readCookieConsent()?.analytics === true;
}

export function saveCookieConsent(analytics: boolean) {
  if (typeof document === "undefined" || typeof window === "undefined") {
    return;
  }

  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  const value = analytics ? "v1-analytics" : "v1-necessary";
  document.cookie = `${COOKIE_NAME}=${value}; Path=/; Max-Age=${ONE_YEAR_SECONDS}; SameSite=Lax${secure}`;
  window.dispatchEvent(new CustomEvent<CookieConsent>(COOKIE_CONSENT_CHANGE_EVENT, {
    detail: { analytics, version: 1 },
  }));
}

export function openCookiePreferences() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(COOKIE_PREFERENCES_OPEN_EVENT));
  }
}
