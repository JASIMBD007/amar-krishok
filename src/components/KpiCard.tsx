import type { LucideIcon } from "lucide-react";
import type { DashboardStat } from "../types";
import { TrendIcon } from "./pages/pageHelpers";

const SPARK_WIDTH = 120;
const SPARK_PAD = 4;
const SPARK_LAST_X = SPARK_WIDTH - SPARK_PAD;

function sparkPoints(spark: number[]) {
  const step = spark.length > 1 ? (SPARK_WIDTH - SPARK_PAD * 2) / (spark.length - 1) : 0;
  return spark.map((y, index) => `${(SPARK_PAD + index * step).toFixed(1)},${y}`).join(" ");
}

/**
 * A single dashboard KPI card: icon chip, optional trend-delta badge, the value,
 * an optional sparkline (y-coordinates in a 0-38 viewBox), and a supporting detail.
 */
export function KpiCard({
  icon: Icon,
  label,
  value,
  detail,
  spark,
  delta,
  trend = "up",
}: {
  icon?: LucideIcon;
  label: string;
  value: string | number;
  detail: string;
  spark?: number[];
  delta?: string;
  trend?: DashboardStat["trend"];
}) {
  return (
    <article className="stat-card dashboard-stat kpi-card">
      <div className="kpi-top">
        {Icon ? (
          <span className="kpi-icon">
            <Icon size={17} />
          </span>
        ) : (
          <span />
        )}
        {delta ? (
          <span className={`kpi-delta ${trend}`}>
            <TrendIcon trend={trend} />
            {delta}
          </span>
        ) : null}
      </div>
      <span className="kpi-label">{label}</span>
      <strong className="kpi-value">{value}</strong>
      {spark && spark.length > 1 ? (
        <svg className="kpi-spark" viewBox={`0 0 ${SPARK_WIDTH} 38`} preserveAspectRatio="none" aria-hidden="true">
          <polyline points={sparkPoints(spark)} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          <circle cx={SPARK_LAST_X} cy={spark[spark.length - 1]} r={3} />
        </svg>
      ) : null}
      <p className="kpi-detail">{detail}</p>
    </article>
  );
}

function bucketByDay(records: Array<{ date?: string | null; value: number }>, days: number) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const buckets = new Array(days).fill(0) as number[];

  for (const record of records) {
    if (!record.date) {
      continue;
    }

    const date = new Date(record.date);
    if (Number.isNaN(date.getTime())) {
      continue;
    }

    date.setHours(0, 0, 0, 0);
    const dayOffset = Math.round((today.getTime() - date.getTime()) / 86_400_000);
    if (dayOffset >= 0 && dayOffset < days) {
      buckets[days - 1 - dayOffset] += record.value;
    }
  }

  return buckets;
}

/**
 * Turn dated records into sparkline y-coordinates for the last `days` days.
 * Returns undefined when there is no activity, so the card renders without a
 * misleading flat line.
 */
export function sparklineFromRecords(records: Array<{ date?: string | null; value: number }>, days = 7): number[] | undefined {
  const series = bucketByDay(records, days);
  const max = Math.max(...series);
  if (max <= 0) {
    return undefined;
  }

  const min = Math.min(...series);
  const range = max - min || 1;
  // Higher values sit nearer the top (smaller y); keep a 6-34 band inside the 0-38 viewBox.
  return series.map((value) => Number((34 - ((value - min) / range) * 28).toFixed(1)));
}
