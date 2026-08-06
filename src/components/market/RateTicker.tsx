import { useEffect } from "react";
import { NavLink } from "react-router-dom";
import { useLanguage, useTranslate, useValueText } from "../../i18n";
import { cropNamesBn } from "../../market/marketData";
import { useLoadRates, useRateChanges } from "../../market/useMarket";
import { useMarketStore } from "../../store/useMarketStore";

function publishedTime(value: string, language: "en" | "bn") {
  const published = new Date(value);
  if (Number.isNaN(published.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat(language === "bn" ? "bn-BD" : "en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(published);
}

/**
 * The persistent rate strip. It is the platform's answer to "what is the fair rate right now?", so
 * it rides along on every route rather than living on the rates page alone.
 */
export function RateTicker() {
  const language = useLanguage();
  const t = useTranslate();
  const v = useValueText();
  const rates = useMarketStore((state) => state.rates);
  const ratesPublishedAt = useMarketStore((state) => state.ratesPublishedAt);
  const changes = useRateChanges();
  const crops = Object.keys(rates);

  // The ticker is on every route, so it is the natural place to pull today's published rates.
  useLoadRates();

  // Only the header is sticky, and it wraps to a second line on narrow viewports, so the offset
  // the rails stick to is measured rather than guessed.
  useEffect(() => {
    const header = document.querySelector<HTMLElement>(".site-header");
    if (!header) {
      return;
    }

    const publish = () => {
      document.documentElement.style.setProperty("--mk-header-height", `${header.offsetHeight}px`);
    };

    publish();
    const observer = new ResizeObserver(publish);
    observer.observe(header);
    return () => observer.disconnect();
  }, []);

  // Until staff have published a rate there is nothing honest to show, so the strip stays away
  // rather than sitting there empty.
  if (crops.length === 0) {
    return null;
  }

  return (
    <div className="rate-ticker">
      <div className="rate-ticker-inner">
        <span className="rate-ticker-eyebrow">
          <span className="live-dot" aria-hidden="true" />
          {t("Today")} · {v(publishedTime(ratesPublishedAt, language))}
        </span>
        <div className="rate-ticker-track">
          {crops.map((crop) => {
            const change = changes[crop] ?? 0;
            const direction = change > 0 ? "up" : change < 0 ? "down" : "flat";
            const changeLabel =
              change === 0 ? "0.0 %" : `${change > 0 ? "▲" : "▼"} ${Math.abs(change).toFixed(1)} %`;

            return (
              <span className="rate-ticker-item" key={crop}>
                {language === "bn" ? cropNamesBn[crop] ?? t(crop) : crop}
                <strong>{v(rates[crop].toLocaleString("en-IN"))}</strong>
                <em className={direction}>{v(changeLabel)}</em>
              </span>
            );
          })}
        </div>
        <NavLink className="rate-ticker-link" to="/prices">
          {t("৳ per mon (40 kg)")}
        </NavLink>
      </div>
    </div>
  );
}
