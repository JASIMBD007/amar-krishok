import { useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { useTranslate } from "../i18n";
import {
  COOKIE_PREFERENCES_OPEN_EVENT,
  readCookieConsent,
  saveCookieConsent,
} from "../privacy/cookieConsent";

export function CookieConsentBanner() {
  const t = useTranslate();
  const initialConsent = readCookieConsent();
  const [analytics, setAnalytics] = useState(initialConsent?.analytics ?? false);
  const [open, setOpen] = useState(initialConsent === null);
  const [showPreferences, setShowPreferences] = useState(false);

  useEffect(() => {
    const handleOpenPreferences = () => {
      setAnalytics(readCookieConsent()?.analytics ?? false);
      setShowPreferences(true);
      setOpen(true);
    };

    window.addEventListener(COOKIE_PREFERENCES_OPEN_EVENT, handleOpenPreferences);
    return () => window.removeEventListener(COOKIE_PREFERENCES_OPEN_EVENT, handleOpenPreferences);
  }, []);

  const save = (analyticsEnabled: boolean) => {
    saveCookieConsent(analyticsEnabled);
    setAnalytics(analyticsEnabled);
    setOpen(false);
    setShowPreferences(false);
  };

  if (!open) {
    return null;
  }

  return (
    <aside className="cookie-consent" aria-labelledby="cookie-consent-title">
      <div className="cookie-consent-heading">
        <span className="cookie-consent-icon" aria-hidden="true">
          <ShieldCheck size={22} />
        </span>
        <div>
          <h2 id="cookie-consent-title">{t("Your privacy choices")}</h2>
          <p>
            {t(
              "We use necessary storage to keep the site working. With your permission, optional analytics helps us understand which pages are useful.",
            )}
          </p>
        </div>
      </div>

      {showPreferences && (
        <div className="cookie-consent-options">
          <div className="cookie-consent-option">
            <div>
              <strong>{t("Necessary cookies")}</strong>
              <p>{t("Required for login, language, security and your consent choice.")}</p>
            </div>
            <span className="cookie-consent-required">{t("Always on")}</span>
          </div>
          <div className="cookie-consent-option">
            <div>
              <strong>{t("Optional analytics")}</strong>
              <p>
                {t(
                  "Records page views, external referrer and approximate country. Form values are never included.",
                )}
              </p>
            </div>
            <button
              aria-checked={analytics}
              aria-label={t("Optional analytics")}
              className={`cookie-consent-switch${analytics ? " on" : ""}`}
              onClick={() => setAnalytics((enabled) => !enabled)}
              role="switch"
              type="button"
            >
              <span className="cookie-consent-switch-track" aria-hidden="true">
                <span />
              </span>
            </button>
          </div>
        </div>
      )}

      <div className="cookie-consent-actions">
        {!showPreferences && (
          <button className="cookie-consent-action manage" type="button" onClick={() => setShowPreferences(true)}>
            {t("Manage preferences")}
          </button>
        )}
        <button className="cookie-consent-action necessary" type="button" onClick={() => save(false)}>
          {t("Only necessary")}
        </button>
        {showPreferences ? (
          <button className="cookie-consent-action accept" type="button" onClick={() => save(analytics)}>
            {t("Save preferences")}
          </button>
        ) : (
          <button className="cookie-consent-action accept" type="button" onClick={() => save(true)}>
            {t("Accept all")}
          </button>
        )}
      </div>
    </aside>
  );
}
