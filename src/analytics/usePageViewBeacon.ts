import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { sendPageView } from "../api/analytics";
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
  const isStaff = user?.role === "admin";

  useEffect(() => {
    if (isStaff) {
      return;
    }

    const path = location.pathname;
    if (lastPath.current === path) {
      return;
    }

    lastPath.current = path;
    sendPageView(path);
  }, [isStaff, location.pathname]);
}
