import { Bell, BellRing, PhoneCall } from "lucide-react";
import { useLanguage, useTranslate, useValueText } from "../../i18n";
import { cropNamesBn } from "../../market/marketData";
import { useRateChanges } from "../../market/useMarket";
import { useMarketStore } from "../../store/useMarketStore";
import { RateSparkline } from "../market/MarketBits";
import { SectionTitle } from "../shared";

function publishedStamp(value: string, language: "en" | "bn") {
  const published = new Date(value);
  if (Number.isNaN(published.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat(language === "bn" ? "bn-BD" : "en-GB", {
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
  }).format(published);
}

/**
 * Today's district rates. This is the benchmark every other surface compares against, so it also
 * carries the SMS alert opt-in and the missed-call fallback for farmers without a smartphone.
 */
export function PricesPage() {
  const language = useLanguage();
  const t = useTranslate();
  const v = useValueText();
  const rates = useMarketStore((state) => state.rates);
  const ratesPublishedAt = useMarketStore((state) => state.ratesPublishedAt);
  const alerts = useMarketStore((state) => state.alerts);
  const toggleAlert = useMarketStore((state) => state.toggleAlert);
  const changes = useRateChanges();

  return (
    <section className="page-wrap rates-page">
      <div className="rates-head">
        <div>
          <SectionTitle eyebrow="Market rates" title="Today's district rate for every crop we track." t={t} />
          {language === "bn" ? <span className="hero-subtitle-bn">আজকের বাজারদর · ৪২টি পাইকারি বাজার</span> : null}
        </div>
        <span>
          {t("Collected from 42 wholesale markets · updated")} {v(publishedStamp(ratesPublishedAt, language))}
        </span>
      </div>

      <div className="panel table-card">
        <div className="table-scroll">
          <div className="rate-table">
            <div className="rate-table-head">
              <span>{t("Crop")}</span>
              <span>৳ / {t("mon")}</span>
              <span>{t("Change")}</span>
              <span>{t("Last 12 days")}</span>
              <span>{t("Alert")}</span>
            </div>
            {Object.keys(rates).map((crop) => {
              const change = changes[crop] ?? 0;
              const direction = change > 0 ? "up" : change < 0 ? "down" : "flat";
              const changeLabel = change === 0 ? "0.0 %" : `${change > 0 ? "+" : "−"}${Math.abs(change).toFixed(1)} %`;
              const alertOn = Boolean(alerts[crop]);

              return (
                <div className="rate-table-row" key={crop}>
                  <div className="rate-crop">
                    <strong>{t(crop)}</strong>
                    <span>{cropNamesBn[crop] ?? ""}</span>
                  </div>
                  <span className="mono-figure">{v(rates[crop].toLocaleString("en-IN"))}</span>
                  <span className={`rate-change ${direction}`}>{v(changeLabel)}</span>
                  <RateSparkline crop={crop} label={`${t(crop)} ${t("Last 12 days")}`} />
                  <span>
                    <button
                      aria-pressed={alertOn}
                      className={alertOn ? "alert-toggle on" : "alert-toggle"}
                      type="button"
                      onClick={() => toggleAlert(crop)}
                    >
                      {alertOn ? <BellRing aria-hidden="true" size={13} /> : <Bell aria-hidden="true" size={13} />}
                      {t(alertOn ? "SMS on" : "Alert me")}
                    </button>
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="panel ivr-card">
        <span className="checkout-row-icon" aria-hidden="true">
          <PhoneCall size={19} />
        </span>
        <p>
          {t("No smartphone? Give a missed call to")} <strong className="mono-figure">16xxx</strong>{" "}
          {t("and today's rate for your crop comes back by SMS in Bangla.")}
        </p>
      </div>
    </section>
  );
}
