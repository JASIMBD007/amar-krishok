import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { sendPageView } from "../api/analytics";
import { COOKIE_CONSENT_CHANGE_EVENT, hasAnalyticsConsent } from "../privacy/cookieConsent";
import type { AuthUser } from "../types";

/**
 * Counts one view per route change.
 *
 * Staff are skipped: an operations team refreshing the console all day would swamp the figures the
 * console is meant to report. The same path is not counted twice in a row either, because a state
 * change that re-renders the router should not read as a second visit.
 */
export function usePageViewBeacon(user: AuthUser | null) {
  const location = useLocation();
  const lastPath = useRef<string | null>(null);
  const [consentRevision, setConsentRevision] = useState(0);
  const isStaff = user?.role === "admin";

  useEffect(() => {
    const handleConsentChange = () => {
      lastPath.current = null;
      setConsentRevision((revision) => revision + 1);
    };

    window.addEventListener(COOKIE_CONSENT_CHANGE_EVENT, handleConsentChange);
    return () => window.removeEventListener(COOKIE_CONSENT_CHANGE_EVENT, handleConsentChange);
  }, []);

  useEffect(() => {
    if (isStaff || !hasAnalyticsConsent()) {
      return;
    }

    const path = location.pathname;
    if (lastPath.current === path) {
      return;
    }

    lastPath.current = path;
    sendPageView(path);
  }, [consentRevision, isStaff, location.pathname]);
}
