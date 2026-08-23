import type { LucideIcon } from "lucide-react";
import { Box, Card, Typography } from "@mui/material";
import type { DashboardStat } from "../types";
import { KpiTrendChart, type KpiTrendPoint } from "./KpiTrendChart";
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
  trendData,
  trendColor,
  delta,
  trend = "up",
}: {
  icon?: LucideIcon;
  label: string;
  value: string | number;
  detail: string;
  spark?: number[];
  trendData?: KpiTrendPoint[];
  trendColor?: string;
  delta?: string;
  trend?: DashboardStat["trend"];
}) {
  return (
    <Card component="article" className="stat-card dashboard-stat kpi-card">
      <Box className="kpi-top">
        {Icon ? (
          <Box component="span" className="kpi-icon">
            <Icon size={17} />
          </Box>
        ) : (
          <span />
        )}
        {delta ? (
          <Box component="span" className={`kpi-delta ${trend}`}>
            <TrendIcon trend={trend} />
            {delta}
          </Box>
        ) : null}
      </Box>
      <Typography component="span" className="kpi-label">{label}</Typography>
      <Typography component="strong" className="kpi-value">{value}</Typography>
      {trendData && trendData.length > 1 ? (
        <KpiTrendChart data={trendData} color={trendColor} />
      ) : spark && spark.length > 1 ? (
        <svg className="kpi-spark" viewBox={`0 0 ${SPARK_WIDTH} 38`} preserveAspectRatio="none" aria-hidden="true">
          <polyline points={sparkPoints(spark)} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          <circle cx={SPARK_LAST_X} cy={spark[spark.length - 1]} r={3} />
        </svg>
      ) : null}
      <Typography component="p" className="kpi-detail">{detail}</Typography>
    </Card>
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

export function trendDataFromRecords(
  records: Array<{ date?: string | null; value: number }>,
  days = 7,
): KpiTrendPoint[] | undefined {
  const series = bucketByDay(records, days);
  if (!series.some((value) => value > 0)) {
    return undefined;
  }

  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (days - 1));

  return series.map((value, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return {
      label: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      value,
    };
  });
}
