import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { NavLink } from "react-router-dom";
import { useLanguage, useTranslate, useValueText } from "../../i18n";
import { cropNamesBn } from "../../market/marketData";
import { useLoadRates, useRateChanges } from "../../market/useMarket";
import { useMarketStore } from "../../store/useMarketStore";
function currentTime(value: Date) {
  // With no explicit timeZone, Intl uses the visitor's browser timezone and applies local DST.
  // en-US keeps the requested AM/PM marker stable even when the rest of the UI is Bengali.
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    hour12: true,
    minute: "2-digit",
  }).format(value);
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
  const changes = useRateChanges();
  const crops = Object.keys(rates);
  const tickerTrackRef = useRef<HTMLDivElement>(null);
  const tickerGroupRef = useRef<HTMLDivElement>(null);
  const [marqueeActive, setMarqueeActive] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const tickerSignature = crops
    .map((crop) => `${crop}:${rates[crop]}:${changes[crop] ?? 0}`)
    .join("|");

  // The ticker is on every route, so it is the natural place to pull today's published rates.
  useLoadRates();

  // Refresh the visitor-local clock without coupling it to the rate publication timestamp.
  useEffect(() => {
    const updateClock = () => setNow(new Date());
    updateClock();
    const interval = window.setInterval(updateClock, 30_000);
    return () => window.clearInterval(interval);
  }, []);

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

  // Keep short rate lists still. When the full list is wider than its window, duplicate it and
  // move both copies as one continuous TV-news-style crawl with no clipped crop names.
  useLayoutEffect(() => {
    const track = tickerTrackRef.current;
    const group = tickerGroupRef.current;
    if (!track || !group) {
      setMarqueeActive(false);
      return;
    }

    const measure = () => setMarqueeActive(group.scrollWidth > track.clientWidth + 1);
    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(track);
    observer.observe(group);
    return () => observer.disconnect();
  }, [language, tickerSignature]);

  // Until staff have published a rate there is nothing honest to show, so the strip stays away
  // rather than sitting there empty.
  if (crops.length === 0) {
    return null;
  }

  const renderItems = (keyPrefix: string) =>
    crops.map((crop) => {
      const change = changes[crop] ?? 0;
      const direction = change > 0 ? "up" : change < 0 ? "down" : "flat";
      const changeLabel =
        change === 0 ? "0.0 %" : `${change > 0 ? "▲" : "▼"} ${Math.abs(change).toFixed(1)} %`;

      return (
        <span className="rate-ticker-item" key={`${keyPrefix}-${crop}`}>
          {language === "bn-BD" ? cropNamesBn[crop] ?? t(crop) : crop}
          <strong>{v(rates[crop].toLocaleString("en-IN"))}</strong>
          <em className={direction}>{v(changeLabel)}</em>
        </span>
      );
    });

  return (
    <div className="rate-ticker">
      <div className="rate-ticker-inner">
        <span className="rate-ticker-eyebrow">
          <span className="live-dot" aria-hidden="true" />
          {t("Today")} · <time dateTime={now.toISOString()}>{v(currentTime(now))}</time>
        </span>
        <div className="rate-ticker-track" ref={tickerTrackRef}>
          <div className={marqueeActive ? "rate-ticker-marquee is-scrolling" : "rate-ticker-marquee"}>
            <div className="rate-ticker-group" ref={tickerGroupRef}>
              {renderItems("primary")}
            </div>
            <div aria-hidden="true" className="rate-ticker-group">
              {renderItems("duplicate")}
            </div>
          </div>
        </div>
        <NavLink className="rate-ticker-link" to="/prices">
          {t("৳ per mon (40 kg)")}
        </NavLink>
      </div>
    </div>
  );
}
