import { useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { Box, Button, Paper, Switch, Typography } from "@mui/material";
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
    <Paper component="aside" elevation={8} className="cookie-consent" aria-labelledby="cookie-consent-title">
      <Box className="cookie-consent-heading">
        <Box component="span" className="cookie-consent-icon" aria-hidden="true">
          <ShieldCheck size={22} />
        </Box>
        <Box>
          <Typography component="h2" id="cookie-consent-title">{t("Your privacy choices")}</Typography>
          <Typography component="p">
            {t(
              "We use necessary storage to keep the site working. With your permission, optional analytics helps us understand which pages are useful.",
            )}
          </Typography>
        </Box>
      </Box>

      {showPreferences && (
        <Box className="cookie-consent-options">
          <Box className="cookie-consent-option">
            <Box>
              <Typography component="strong">{t("Necessary cookies")}</Typography>
              <Typography component="p">{t("Required for login, language, security and your consent choice.")}</Typography>
            </Box>
            <Typography component="span" className="cookie-consent-required">{t("Always on")}</Typography>
          </Box>
          <Box className="cookie-consent-option">
            <Box>
              <Typography component="strong">{t("Optional analytics")}</Typography>
              <Typography component="p">
                {t(
                  "Records page views, external referrer and approximate country. Form values are never included.",
                )}
              </Typography>
            </Box>
            <Switch
              checked={analytics}
              onChange={(_, checked) => setAnalytics(checked)}
              slotProps={{ input: { "aria-label": t("Optional analytics") } }}
            />
          </Box>
        </Box>
      )}

      <Box className="cookie-consent-actions">
        {!showPreferences && (
          <Button className="cookie-consent-action manage" variant="text" type="button" onClick={() => setShowPreferences(true)}>
            {t("Manage preferences")}
          </Button>
        )}
        <Button className="cookie-consent-action necessary" variant="outlined" type="button" onClick={() => save(false)}>
          {t("Only necessary")}
        </Button>
        {showPreferences ? (
          <Button className="cookie-consent-action accept" variant="contained" type="button" onClick={() => save(analytics)}>
            {t("Save preferences")}
          </Button>
        ) : (
          <Button className="cookie-consent-action accept" variant="contained" type="button" onClick={() => save(true)}>
            {t("Accept all")}
          </Button>
        )}
      </Box>
    </Paper>
  );
}
