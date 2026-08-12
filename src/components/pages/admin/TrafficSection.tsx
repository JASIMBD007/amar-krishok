import { useCallback, useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ApiRequestError } from "../../../api/auth";
import { fetchTrafficSummary, type TrafficSummary } from "../../../api/analytics";
import { useLanguage, useTranslate, useValueText } from "../../../i18n";
import type { AuthUser } from "../../../types";
import { ListLoading } from "../../EmptyState";

const RANGES = [7, 30, 90] as const;

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
        setError(requestError instanceof ApiRequestError ? requestError.message : "Could not load traffic.");
      })
      .finally(() => setIsLoading(false));
  }, [accessToken, days]);

  useEffect(() => load(), [load]);

  const topCountry = summary?.countries[0];
  // Short labels: 90 daily ticks will not fit, so only the day-of-month is drawn.
  const chartData = (summary?.daily ?? []).map((day) => ({ ...day, label: day.date.slice(8) }));

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
                <BarChart data={chartData} margin={{ bottom: 4, left: -18, right: 8, top: 8 }}>
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
                  <Bar dataKey="views" fill="#146b45" name={t("Page views")} radius={[4, 4, 0, 0]} />
                </BarChart>
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
                <div className="admin-traffic-list">
                  {summary.countries.slice(0, 10).map((row) => {
                    const share = summary.totalViews ? Math.round((row.views / summary.totalViews) * 100) : 0;
                    return (
                      <div className="admin-traffic-row" key={row.countryCode}>
                        <span aria-hidden="true">{flagFor(row.countryCode)}</span>
                        <strong>{countryName(row.countryCode, locale) ?? t("Unknown")}</strong>
                        <span className="admin-traffic-bar" aria-hidden="true">
                          <span style={{ width: `${Math.max(2, share)}%` }} />
                        </span>
                        <span className="mono-figure">{v(row.views.toLocaleString("en-US"))}</span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="panel-note">
                  {t("No country data yet. Add the GeoLite2 database to place visitors on a map.")}
                </p>
              )}
            </div>

            <div className="desk-panel">
              <div className="desk-panel-head">
                <h2>{t("Top pages")}</h2>
                <span>{t("By page views")}</span>
              </div>
              <div className="admin-traffic-list">
                {summary.topPaths.length === 0 ? (
                  <p className="panel-note">{t("No visits recorded yet.")}</p>
                ) : (
                  summary.topPaths.map((row) => (
                    <div className="admin-traffic-row compact" key={row.path}>
                      <strong className="mono-figure">{row.path}</strong>
                      <span className="mono-figure">{v(row.views.toLocaleString("en-US"))}</span>
                    </div>
                  ))
                )}
              </div>
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
