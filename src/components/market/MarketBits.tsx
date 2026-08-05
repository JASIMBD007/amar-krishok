import { AlertTriangle, BadgeCheck, Check, Clock3, Info } from "lucide-react";
import { useTranslate, useValueText } from "../../i18n";
import type { FairVerdict } from "../../market/marketData";
import { useRateSeries } from "../../market/useMarket";

/**
 * How a price compares to today's district rate. Green at or below the rate, amber above it —
 * always with the number spelled out, never colour alone.
 */
export function DeltaPill({ delta, withSuffix = false }: { delta: number; withSuffix?: boolean }) {
  const v = useValueText();
  const t = useTranslate();

  return (
    <span className={`delta-pill ${delta <= 0 ? "good" : "warn"}`}>
      {v(`${delta > 0 ? "+" : ""}${delta} %`)}
      {withSuffix ? <em>{t("vs. market")}</em> : null}
    </span>
  );
}

export function EscrowPill({ state }: { state: "held" | "released" | "refunded" }) {
  const t = useTranslate();
  const label = state === "held" ? "Held" : state === "released" ? "Released" : "Refunded";
  return <span className={`escrow-pill ${state}`}>{t(label)}</span>;
}

export function VerificationBadge({ verified }: { verified: boolean }) {
  const t = useTranslate();
  return (
    <span className={`verify-badge ${verified ? "verified" : "pending"}`}>
      {verified ? <BadgeCheck aria-hidden="true" size={13} /> : <Clock3 aria-hidden="true" size={13} />}
      {t(verified ? "Verified farm" : "Verification pending")}
    </span>
  );
}

export function VerdictPill({ verdict }: { verdict: FairVerdict }) {
  const t = useTranslate();
  const config = {
    above: { className: "warn", icon: AlertTriangle, label: "Above range" },
    below: { className: "info", icon: Info, label: "Below range" },
    fair: { className: "good", icon: Check, label: "Fair range" },
  }[verdict];
  const Icon = config.icon;

  return (
    <span className={`verdict-pill ${config.className}`}>
      <Icon aria-hidden="true" size={12} />
      {t(config.label)}
    </span>
  );
}

/** 12-bar rate sparkline, drawn from the published rate history. */
export function RateSparkline({ crop, label }: { crop: string; label: string }) {
  const bars = useRateSeries(crop);

  return (
    <div className="rate-sparkline" role="img" aria-label={label}>
      {bars.map((height, index) => (
        <span key={index} style={{ height: `${height}%` }} />
      ))}
    </div>
  );
}

/** The rate history on the lot page — the last four bars read as "recent". */
export function RateHistoryBars({ crop, label }: { crop: string; label: string }) {
  const bars = useRateSeries(crop);

  return (
    <div className="rate-history" role="img" aria-label={label}>
      {bars.map((height, index) => (
        <span className={index >= bars.length - 4 ? "recent" : "older"} key={index} style={{ height: `${height}%` }} />
      ))}
    </div>
  );
}
