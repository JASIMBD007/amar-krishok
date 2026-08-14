import { apiRequest } from "./auth";
import { environment } from "../config/environment";
import { hasAnalyticsConsent } from "../privacy/cookieConsent";

export type TrafficSummary = {
  countries: { countryCode: string; views: number; visitors: number }[];
  daily: { date: string; views: number; visitors: number }[];
  days: number;
  hasCountryData: boolean;
  referrers: { host: string; views: number }[];
  topPaths: { path: string; views: number }[];
  totalViews: number;
  totalVisitors: number;
};

export function fetchTrafficSummary(accessToken: string, days: number) {
  return apiRequest<TrafficSummary>(`/api/analytics/summary?days=${encodeURIComponent(days)}`, { accessToken });
}

/**
 * True when the visitor has asked not to be counted. Both signals are honoured: Global Privacy
 * Control is the one with legal weight in some jurisdictions, Do Not Track the one people actually
 * have switched on.
 */
function optedOut() {
  const nav = navigator as Navigator & { globalPrivacyControl?: boolean; msDoNotTrack?: string };
  return nav.globalPrivacyControl === true || nav.doNotTrack === "1" || nav.msDoNotTrack === "1";
}

/**
 * Records one page view. Fire-and-forget by design: nothing on the page waits for it, and every
 * failure is swallowed, so a farmer on a slow connection never pays for our counter.
 *
 * sendBeacon is preferred because it survives the navigation that triggered it. It queues the
 * request at the browser level, which is also why the reply is unreadable — and unneeded.
 */
export function sendPageView(path: string) {
  if (!hasAnalyticsConsent() || optedOut()) {
    return;
  }

  // Pathname only. A query string here could carry a phone number or a password-reset token.
  const body = JSON.stringify({ path, referrer: document.referrer || undefined });
  const url = `${environment.apiBaseUrl}/api/analytics/pageview`;

  try {
    if (navigator.sendBeacon) {
      navigator.sendBeacon(url, new Blob([body], { type: "application/json" }));
      return;
    }

    void fetch(url, {
      body,
      headers: { "Content-Type": "application/json" },
      keepalive: true,
      method: "POST",
    }).catch(() => {
      // A missed count is not worth a console error on a visitor's machine.
    });
  } catch {
    // Same: analytics must never be the reason something breaks.
  }
}
