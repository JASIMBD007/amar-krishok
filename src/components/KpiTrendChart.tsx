import { Area, AreaChart, ResponsiveContainer, XAxis, YAxis } from "recharts";

export type KpiTrendPoint = {
  label: string;
  value: number;
};

export function KpiTrendChart({
  data,
  color = "var(--ak-green-bright)",
}: {
  data: KpiTrendPoint[];
  color?: string;
}) {
  return (
    <div className="kpi-chart" aria-hidden="true">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 6, right: 2, bottom: 0, left: 2 }}>
          <XAxis dataKey="label" hide />
          <YAxis hide domain={["auto", "auto"]} />
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            fill={color}
            fillOpacity={0.12}
            strokeWidth={2.5}
            dot={false}
            activeDot={false}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
