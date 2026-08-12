import { useCallback, useEffect, useState } from "react";
import { Area, AreaChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ApiRequestError } from "../../../api/auth";
import { fetchTrafficSummary, type TrafficSummary } from "../../../api/analytics";
import { useLanguage, useTranslate, useValueText } from "../../../i18n";
import type { AuthUser } from "../../../types";
import { ListLoading } from "../../EmptyState";

const RANGES = [7, 30, 90] as const;

/**
 * Categorical slots in fixed order, so a country keeps its colour when the filter changes.
 * Validated for colourblind separation against a light surface; three sit under 3:1 contrast,
 * which is why every slice is also named and numbered in the legend rather than colour alone.
 */
const SLICE_COLOURS = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300"];
const OTHER_COLOUR = "#9aa3af";
/** Past six slices a pie stops being readable, so the tail is folded into one "Other". */
const MAX_SLICES = 6;

/**
 * Country names without a dependency. `Intl.DisplayNames` ships with the browser and localises
 * itself, so "BD" reads as বাংলাদেশ in Bangla and Bangladesh in English for free.
 */
function countryName(code: string, locale: string) {
  if (code === "??") {
    return null;
  }

  try {
    return new Intl.DisplayNames([locale], { type: "region" }).of(code) ?? code;
  } catch {
    return code;
  }
}

/** Regional-indicator letters render the flag, so no image or icon set is needed. */
function flagFor(code: string) {
  if (code === "??" || code.length !== 2) {
    return "🌐";
  }

  return String.fromCodePoint(...[...code.toUpperCase()].map((letter) => 0x1f1a5 + letter.charCodeAt(0)));
}

export function AdminTraffic({ user }: { user: AuthUser | null }) {
  const t = useTranslate();
  const v = useValueText();
  const locale = useLanguage();
  const [days, setDays] = useState<number>(30);
  const [summary, setSummary] = useState<TrafficSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const accessToken = user?.accessToken;

  const load = useCallback(() => {
    if (!accessToken) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    fetchTrafficSummary(accessToken, days)
      .then((result) => {
        setSummary(result);
        setError("");
      })
      .catch((requestError) => {
        // A 404 here means the API is older than this page: the route ships with the analytics
        // module. Saying so beats showing the server's raw "Cannot GET /api/..." to an operator.
        if (requestError instanceof ApiRequestError && requestError.status === 404) {
          setError("Traffic needs a newer API build. Deploy the backend, then reload this page.");
          return;
        }

        setError(requestError instanceof ApiRequestError ? requestError.message : "Could not load traffic.");
      })
      .finally(() => setIsLoading(false));
  }, [accessToken, days]);

  useEffect(() => load(), [load]);

  const topCountry = summary?.countries[0];
  // Short labels: 90 daily ticks will not fit, so only the day-of-month is drawn.
  const chartData = (summary?.daily ?? []).map((day) => ({ ...day, label: day.date.slice(8) }));

  // Six named slices plus one "Other", so the donut stays readable however many countries appear.
  const countrySlices = (() => {
    const rows = summary?.countries.filter((row) => row.countryCode !== "??") ?? [];
    const total = rows.reduce((sum, row) => sum + row.views, 0) || 1;
    const head = rows.slice(0, MAX_SLICES);
    const tail = rows.slice(MAX_SLICES);
    const slices = head.map((row, index) => ({
      code: row.countryCode,
      colour: SLICE_COLOURS[index % SLICE_COLOURS.length],
      label: `${flagFor(row.countryCode)}  ${countryName(row.countryCode, locale) ?? row.countryCode}`,
      share: Math.round((row.views / total) * 100),
      views: row.views,
    }));

    if (tail.length) {
      const views = tail.reduce((sum, row) => sum + row.views, 0);
      slices.push({
        code: "other",
        colour: OTHER_COLOUR,
        label: `${t("Other")} (${tail.length})`,
        share: Math.round((views / total) * 100),
        views,
      });
    }

    return slices;
  })();

  // Top pages, sliced the same way. Paths are their own labels, so no flag or lookup is needed.
  const pathSlices = (() => {
    const rows = summary?.topPaths ?? [];
    const total = rows.reduce((sum, row) => sum + row.views, 0) || 1;
    const head = rows.slice(0, MAX_SLICES);
    const tail = rows.slice(MAX_SLICES);
    const slices = head.map((row, index) => ({
      code: row.path,
      colour: SLICE_COLOURS[index % SLICE_COLOURS.length],
      label: row.path,
      share: Math.round((row.views / total) * 100),
      views: row.views,
    }));

    if (tail.length) {
      const views = tail.reduce((sum, row) => sum + row.views, 0);
      slices.push({
        code: "other",
        colour: OTHER_COLOUR,
        label: `${t("Other")} (${tail.length})`,
        share: Math.round((views / total) * 100),
        views,
      });
    }

    return slices;
  })();

  return (
    <div className="admin-traffic">
      <div className="admin-traffic-ranges" role="group" aria-label={t("Date range")}>
        {RANGES.map((range) => (
          <button
            aria-pressed={days === range}
            className={days === range ? "filter-pill on" : "filter-pill"}
            key={range}
            type="button"
            onClick={() => setDays(range)}
          >
            {t("Last")} {v(range)} {t("days")}
          </button>
        ))}
      </div>

      {error ? <p className="soft-notice warn">{t(error)}</p> : null}
      {isLoading && !summary ? <ListLoading label={t("Loading traffic...")} /> : null}

      {summary ? (
        <>
          <section className="farmer-escrow-grid" aria-label={t("Traffic summary")}>
            <article className="desk-kpi">
              <span className="desk-kpi-label">{t("Page views")}</span>
              <strong className="desk-kpi-value mono-figure">{v(summary.totalViews.toLocaleString("en-US"))}</strong>
              <span className="desk-kpi-note">
                {t("Over the last")} {v(summary.days)} {t("days")}
              </span>
            </article>
            <article className="desk-kpi">
              <span className="desk-kpi-label">{t("Visitors")}</span>
              <strong className="desk-kpi-value mono-figure">{v(summary.totalVisitors.toLocaleString("en-US"))}</strong>
              {/* Said plainly: the daily salt makes a true multi-day unique impossible by design. */}
              <span className="desk-kpi-note">{t("Counted once per person per day")}</span>
            </article>
            <article className="desk-kpi">
              <span className="desk-kpi-label">{t("Countries")}</span>
              <strong className="desk-kpi-value mono-figure">
                {v(summary.countries.filter((row) => row.countryCode !== "??").length)}
              </strong>
              <span className="desk-kpi-note">
                {topCountry && topCountry.countryCode !== "??"
                  ? `${t("Most from")} ${countryName(topCountry.countryCode, locale) ?? topCountry.countryCode}`
                  : t("No country data yet")}
              </span>
            </article>
            <article className="desk-kpi">
              <span className="desk-kpi-label">{t("Busiest day")}</span>
              <strong className="desk-kpi-value mono-figure">
                {v(Math.max(0, ...summary.daily.map((day) => day.views)).toLocaleString("en-US"))}
              </strong>
              <span className="desk-kpi-note">{t("Page views in a single day")}</span>
            </article>
          </section>

          <div className="desk-panel admin-traffic-chart">
            <div className="desk-panel-head">
              <h2>{t("Visits per day")}</h2>
              <span>{t("Page views, newest on the right")}</span>
            </div>
            <div className="admin-traffic-chart-body">
              <ResponsiveContainer height={240} width="100%">
                <AreaChart data={chartData} margin={{ bottom: 4, left: -18, right: 8, top: 8 }}>
                  <defs>
                    <linearGradient id="trafficFill" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="#146b45" stopOpacity={0.24} />
                      <stop offset="100%" stopColor="#146b45" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#f1f3f6" vertical={false} />
                  <XAxis
                    axisLine={false}
                    dataKey="label"
                    interval="preserveStartEnd"
                    minTickGap={14}
                    tick={{ fill: "#6b7280", fontSize: 11 }}
                    tickLine={false}
                  />
                  <YAxis
                    allowDecimals={false}
                    axisLine={false}
                    tick={{ fill: "#6b7280", fontSize: 11 }}
                    tickLine={false}
                    width={44}
                  />
                  <Tooltip
                    contentStyle={{ border: "1px solid #e2e5eb", borderRadius: 8, fontSize: 13 }}
                    cursor={{ fill: "#f5f7fa" }}
                    labelFormatter={(label) => `${t("Day")} ${label}`}
                  />
                  <Area
                    dataKey="views"
                    fill="url(#trafficFill)"
                    name={t("Page views")}
                    stroke="#146b45"
                    strokeWidth={2}
                    type="monotone"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="admin-traffic-columns">
            <div className="desk-panel">
              <div className="desk-panel-head">
                <h2>{t("Countries")}</h2>
                <span>{t("By page views")}</span>
              </div>
              {summary.hasCountryData ? (
                <div className="admin-traffic-donut">
                  <ResponsiveContainer height={190} width="100%">
                    <PieChart>
                      <Pie
                        data={countrySlices}
                        dataKey="views"
                        innerRadius={52}
                        nameKey="label"
                        outerRadius={82}
                        paddingAngle={2}
                        stroke="var(--surface)"
                        strokeWidth={2}
                      >
                        {countrySlices.map((slice) => (
                          <Cell fill={slice.colour} key={slice.code} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ border: "1px solid #e2e5eb", borderRadius: 8, fontSize: 13 }}
                        formatter={(value, name) => [`${Number(value ?? 0)} ${t("Page views")}`, String(name ?? "")]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  {/* The legend is not decoration: three of the slice colours sit under 3:1 on
                      this surface, so identity has to be carried by name and number too. */}
                  <ul className="admin-traffic-legend">
                    {countrySlices.map((slice) => (
                      <li key={slice.code}>
                        <i style={{ background: slice.colour }} aria-hidden="true" />
                        <span>{slice.label}</span>
                        <em className="mono-figure">{v(slice.views.toLocaleString("en-US"))}</em>
                        <b className="mono-figure">{v(`${slice.share} %`)}</b>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="panel-note">
                  {t("No country data yet. Redeploy the API to build the country database.")}
                </p>
              )}
            </div>

            <div className="desk-panel">
              <div className="desk-panel-head">
                <h2>{t("Top pages")}</h2>
                <span>{t("By page views")}</span>
              </div>
              {summary.topPaths.length === 0 ? (
                <p className="panel-note">{t("No visits recorded yet.")}</p>
              ) : (
                <div className="admin-traffic-donut">
                  <ResponsiveContainer height={190} width="100%">
                    <PieChart>
                      <Pie
                        data={pathSlices}
                        dataKey="views"
                        innerRadius={52}
                        nameKey="label"
                        outerRadius={82}
                        paddingAngle={2}
                        stroke="var(--surface)"
                        strokeWidth={2}
                      >
                        {pathSlices.map((slice) => (
                          <Cell fill={slice.colour} key={slice.code} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ border: "1px solid #e2e5eb", borderRadius: 8, fontSize: 13 }}
                        formatter={(value, name) => [`${Number(value ?? 0)} ${t("Page views")}`, String(name ?? "")]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  {/* Paths are long, so the legend carries them at full width in mono rather than
                      trying to fit them around a wedge. */}
                  <ul className="admin-traffic-legend paths">
                    {pathSlices.map((slice) => (
                      <li key={slice.code}>
                        <i style={{ background: slice.colour }} aria-hidden="true" />
                        <span className="mono-figure">{slice.label}</span>
                        <em className="mono-figure">{v(slice.views.toLocaleString("en-US"))}</em>
                        <b className="mono-figure">{v(`${slice.share} %`)}</b>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {summary.referrers.length > 0 ? (
                <>
                  <div className="desk-panel-head admin-traffic-subhead">
                    <h2>{t("Referrers")}</h2>
                  </div>
                  <div className="admin-traffic-list">
                    {summary.referrers.map((row) => (
                      <div className="admin-traffic-row compact" key={row.host}>
                        <strong>{row.host}</strong>
                        <span className="mono-figure">{v(row.views.toLocaleString("en-US"))}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
