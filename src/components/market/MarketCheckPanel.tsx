import { useTranslate, useValueText } from "../../i18n";
import {
  RANGE_HIGH_FACTOR,
  RANGE_LOW_FACTOR,
  deltaVsRate,
  fairVerdict,
  perKgToPerMon,
  perMonToPerKg,
  taka,
} from "../../market/marketData";
import { useMarketStore } from "../../store/useMarketStore";
import { VerdictPill } from "./MarketBits";

/**
 * The pricing coach on the posting form. It answers the farmer's real question — "is this ask going
 * to sell?" — by placing it on the district's fair band instead of leaving them to guess.
 */
export function MarketCheckPanel({
  crop,
  district,
  pricePerKg,
}: {
  crop: string;
  district: string;
  pricePerKg: number;
}) {
  const t = useTranslate();
  const v = useValueText();
  const rates = useMarketStore((state) => state.rates);

  const rate = rates[crop.trim()];
  const askPerMon = perKgToPerMon(pricePerKg);

  if (!rate) {
    return (
      <div className="market-check idle">
        <span className="filter-eyebrow">{t("Market check")}</span>
        <p>
          {crop.trim()
            ? t("No published district rate for this crop yet. Staff publish rates every morning.")
            : t("Enter the crop and your asking price to see how it compares with today's district rate.")}
        </p>
      </div>
    );
  }

  if (!askPerMon) {
    return (
      <div className="market-check idle">
        <div className="market-check-head">
          <span className="filter-eyebrow">
            {t("Market check")} · {t(district) || t("your district")}
          </span>
        </div>
        <p>
          {t("Today's district rate is")} <strong className="mono-figure">{v(taka(rate))}</strong> / {t("mon")} (
          <strong className="mono-figure">{v(perMonToPerKg(rate).toFixed(2))}</strong> / {t("kg")}).{" "}
          {t("Enter your asking price to check it.")}
        </p>
      </div>
    );
  }

  const delta = deltaVsRate(askPerMon, rate);
  const verdict = fairVerdict(delta);
  const low = Math.round(rate * RANGE_LOW_FACTOR);
  const high = Math.round(rate * RANGE_HIGH_FACTOR);
  // Clamped to 2–98 % so the marker never disappears under the rounded ends of the bar.
  const markerLeft = Math.max(2, Math.min(98, ((askPerMon - low) / (high - low)) * 100));

  const advice =
    verdict === "above"
      ? `${t("Your ask is")} ${v(`${delta} %`)} ${t("above the district average — lots priced this high usually sit unsold for over a week.")}`
      : verdict === "below"
        ? `${t("Your ask is")} ${v(`${Math.abs(delta)} %`)} ${t("below the average. It will sell fast, but you are leaving money on the table.")}`
        : `${t("Your ask sits")} ${v(`${Math.abs(delta)} %`)} ${t(delta >= 0 ? "above" : "below")} ${t("the district average — buyers usually accept within a week at this price.")}`;

  return (
    <div className={`market-check ${verdict}`}>
      <div className="market-check-head">
        <span className="filter-eyebrow">
          {t("Market check")} · {t(district) || t("your district")}
        </span>
        <VerdictPill verdict={verdict} />
      </div>
      <div className="market-check-bar">
        <span className="market-check-marker" style={{ left: `${markerLeft.toFixed(1)}%` }} aria-hidden="true" />
      </div>
      <div className="market-check-scale">
        <span className="mono-figure">{v(taka(low))}</span>
        <span>
          {t("avg")} <strong className="mono-figure">{v(taka(rate))}</strong>
        </span>
        <span className="mono-figure">{v(taka(high))}</span>
      </div>
      <p>{advice}</p>
      <span className="market-check-foot">
        {t("Your ask")} <strong className="mono-figure">{v(taka(askPerMon))}</strong> / {t("mon")} ·{" "}
        {t("district rate")} <strong className="mono-figure">{v(taka(rate))}</strong> / {t("mon")}
      </span>
    </div>
  );
}
