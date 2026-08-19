import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  BarChart3,
  CreditCard,
  Heart,
  LayoutDashboard,
  Package,
  Search,
  TrendingDown,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import { ApiRequestError, fetchMyOrders, type BackendOrder } from "../../api/auth";
import { fetchBuyerDashboard, type BuyerDashboard, type DashboardTask } from "../../api/dashboard";
import { useLanguage, useTranslate, useValueText } from "../../i18n";
import { cropNamesBn, deltaVsRate, kgToMon, perKgToPerMon, signedPercent, taka } from "../../market/marketData";
import { useMarketStore } from "../../store/useMarketStore";
import type { AuthUser, CropLot } from "../../types";
import { EmptyState, ListLoading } from "../EmptyState";
import {
  ByCrop,
  KpiTile,
  LedgerPanel,
  NeedsYouFirst,
  NextMoneyMovement,
  ValueMovedPerDay,
  WhereOrdersSit,
} from "../workspace/WorkspacePanels";
import { WorkspaceOrderTable } from "../workspace/WorkspaceOrderTable";
import { WorkspaceShell, type WorkspaceNavGroup } from "../workspace/WorkspaceShell";

/**
 * The buyer workspace: `/orders`. The same shell the farmer's `/desk` uses, with the buying side of
 * the same order book.
 *
 * Escrow and spend are the gross this buyer actually paid. "Saved vs. district rate" comes from
 * `GET /buyer/dashboard` and compares the crop subtotal only — transport and the platform fee are
 * excluded, because including them once produced a dashboard figure that contradicted the same lot's
 * own fair-price badge.
 */

type BuyerTab = "overview" | "orders" | "watchlist" | "suppliers" | "payments" | "insights";

const TAB_META: Record<BuyerTab, { subtitle: string; title: string }> = {
  overview: { title: "Buyer dashboard", subtitle: "Your buying position today — orders, escrow and spend" },
  orders: { title: "My orders", subtitle: "Every order you have placed and its escrow state" },
  watchlist: { title: "Watchlist", subtitle: "Lots you are following · alerts when the price drops" },
  suppliers: { title: "Suppliers", subtitle: "Farmers you have bought from before" },
  payments: { title: "Payments", subtitle: "Payments made and escrow released" },
  insights: { title: "Price insights", subtitle: "What you paid against the district rate" },
};

const TABS: BuyerTab[] = ["overview", "orders", "watchlist", "suppliers", "payments", "insights"];

function tabFromSearch(value: string | null): BuyerTab {
  return TABS.find((tab) => tab === value) ?? "overview";
}

function initialsOf(name: string) {
  return name
    .replace(/^(Md\.|Mst\.|Mrs\.|Mr\.)\s*/i, "")
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function BuyerDashboardPage({
  lots,
  onOpenMessages,
  user,
}: {
  /** The marketplace lots the app already loads, so the watchlist needs no endpoint of its own. */
  lots: CropLot[];
  onOpenMessages: () => void;
  user: AuthUser | null;
}) {
  const navigate = useNavigate();
  const language = useLanguage();
  const t = useTranslate();
  const v = useValueText();
  const [search, setSearch] = useSearchParams();
  const tab = tabFromSearch(search.get("tab"));
  const rates = useMarketStore((state) => state.rates);
  const alerts = useMarketStore((state) => state.alerts);

  const [dashboard, setDashboard] = useState<BuyerDashboard | null>(null);
  const [orders, setOrders] = useState<BackendOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const accessToken = user?.accessToken;

  const load = useCallback(() => {
    if (!accessToken) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    Promise.all([fetchBuyerDashboard(accessToken), fetchMyOrders(accessToken).catch(() => [] as BackendOrder[])])
      .then(([summary, myOrders]) => {
        setDashboard(summary);
        setOrders(myOrders);
        setError("");
      })
      .catch((requestError) => {
        setError(requestError instanceof ApiRequestError ? requestError.message : "Could not load your dashboard.");
      })
      .finally(() => setIsLoading(false));
  }, [accessToken]);

  useEffect(() => load(), [load]);

  /** The watchlist is the crops this buyer has a rate alert on, matched against the live lots. */
  const watchlist = useMemo(
    () =>
      lots
        .filter((lot) => alerts[lot.crop])
        .map((lot) => {
          const pricePerMon = perKgToPerMon(lot.pricePerKg ?? 0);
          const rate = rates[lot.crop];
          return {
            crop: lot.crop,
            delta: rate ? deltaVsRate(pricePerMon, rate) : null,
            district: lot.district,
            grade: lot.grade.replace(/^Grade\s+/i, ""),
            id: lot.id,
            pricePerMon,
            quantityMon: Math.max(1, Math.round(kgToMon(lot.quantityKg ?? 0))),
          };
        }),
    [alerts, lots, rates],
  );

  const openTab = (next: BuyerTab) => {
    setSearch(next === "overview" ? {} : { tab: next }, { replace: false });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const act = (task: DashboardTask) => {
    if (task.action === "market" || task.action === "post") {
      navigate("/marketplace");
      return;
    }

    openTab(task.action === "orders" ? "orders" : task.action === "payments" ? "payments" : "overview");
  };

  const groups: Array<WorkspaceNavGroup<BuyerTab>> = [
    {
      title: "Buying",
      items: [
        { icon: LayoutDashboard, label: "Dashboard", tab: "overview" },
        { count: dashboard?.counts.orders, icon: Package, label: "My orders", tab: "orders" },
        { count: watchlist.length, icon: Heart, label: "Watchlist", tab: "watchlist" },
        { count: dashboard?.counts.suppliers, icon: Users, label: "Suppliers", tab: "suppliers" },
      ],
    },
    {
      title: "Money",
      items: [
        { icon: Wallet, label: "Payments", tab: "payments" },
        { icon: BarChart3, label: "Price insights", tab: "insights" },
      ],
    },
  ];

  const kpis = dashboard?.kpis;
  const hasOrders = (dashboard?.counts.orders ?? 0) > 0;
  const savedDelta = kpis?.savedVsRateDelta ?? null;

  return (
    <WorkspaceShell
      groups={groups}
      identity={
        dashboard?.identity ?? {
          district: user?.district ?? "",
          name: user?.name ?? "",
          verificationPending: false,
          verified: false,
        }
      }
      onMessages={onOpenMessages}
      onProfile={() => navigate("/profile")}
      onSelectTab={openTab}
      primaryAction={{
        icon: Search,
        label: "Browse the market",
        onClick: () => navigate("/marketplace"),
        tone: "green",
      }}
      ratesPublishedAt={dashboard?.ratesPublishedAt ?? null}
      subtitle={TAB_META[tab].subtitle}
      tab={tab}
      title={TAB_META[tab].title}
    >
      {error ? <p className="marketplace-feedback warning">{t(error)}</p> : null}
      {isLoading && !dashboard ? <ListLoading label={t("Loading your dashboard...")} /> : null}

      {tab === "overview" && kpis ? (
        <div className="workspace-overview">
          <div className="workspace-kpi-grid">
            <KpiTile
              eyebrow="Held in escrow"
              value={taka(kpis.heldInEscrow)}
              footnote={`${v(kpis.openOrderCount)} ${t(kpis.openOrderCount === 1 ? "open order" : "open orders")} · ${t("released on your confirmation")}`}
            />
            <KpiTile
              eyebrow="Spend this month"
              value={taka(kpis.spendThisMonth)}
              footnote={`${v(kpis.ordersThisMonth)} ${t(kpis.ordersThisMonth === 1 ? "order placed" : "orders placed")}`}
            />
            {/* Hidden entirely when nothing could be compared — a zero here would read as "no saving". */}
            {kpis.savedVsRate === null ? (
              <KpiTile
                eyebrow="Saved vs. district rate"
                qualifier="On the crop only"
                value={taka(0)}
                footnote={t("Every order is compared to the district rate published on the day you ordered.")}
              />
            ) : (
              <KpiTile
                eyebrow="Saved vs. district rate"
                qualifier="On the crop only"
                value={taka(kpis.savedVsRate)}
                footnote={
                  savedDelta === null ? null : (
                    <span className={savedDelta > 0 ? "workspace-delta over" : "workspace-delta under"}>
                      {savedDelta > 0 ? (
                        <TrendingUp aria-hidden="true" size={13} />
                      ) : (
                        <TrendingDown aria-hidden="true" size={13} />
                      )}
                      {savedDelta === 0
                        ? t("At the district rate on the crop")
                        : `${v(Math.abs(savedDelta).toFixed(1))} % ${t(savedDelta < 0 ? "under the district rate on the crop" : "over the district rate on the crop")}`}
                    </span>
                  )
                }
              />
            )}
            <KpiTile
              eyebrow="Needs your action"
              tone="danger"
              value={String(kpis.needsAction)}
              footnote={t(
                kpis.needsAction
                  ? kpis.needsAction === 1
                    ? "Delivery waiting for confirmation"
                    : "Deliveries waiting for confirmation"
                  : "Nothing waiting on you",
              )}
            />
          </div>

          <div className="workspace-overview-columns">
            <div>
              <NeedsYouFirst onAct={act} tasks={dashboard.tasks} />
              <ValueMovedPerDay
                emptyHint="Nothing has moved yet — your first order will show up here."
                series={dashboard.daySeries}
                tradingDays={dashboard.tradingDays}
              />
            </div>
            <div>
              <WhereOrdersSit hasOrders={hasOrders} stages={dashboard.stages} />
              <ByCrop note="Crop cost, before transport and fee" slices={dashboard.byCrop} />
              <NextMoneyMovement
                emptyHint="Nothing is currently held in escrow."
                movement={dashboard.nextMovement}
                whose="The farmer's share of"
              />
            </div>
          </div>
        </div>
      ) : null}

      {tab === "orders" ? (
        <WorkspaceOrderTable
          emptyAction={
            <button className="primary-button" type="button" onClick={() => navigate("/marketplace")}>
              {t("Browse the marketplace")}
            </button>
          }
          emptyHint="Your money stays in escrow until you confirm the delivery."
          emptyTitle="No orders yet"
          orders={orders}
          valueLabel="Value"
          valueOf={(order) => order.viewerShare ?? (Number(order.totalValue) || 0)}
        />
      ) : null}

      {tab === "watchlist" ? (
        watchlist.length === 0 ? (
          <EmptyState
            icon={Heart}
            title={t("Nothing on your watchlist")}
            hint={t("Turn on an alert for a crop on the Market rates page and its lots appear here.")}
            action={
              <button className="secondary-button" type="button" onClick={() => navigate("/prices")}>
                {t("Open market rates")}
              </button>
            }
          />
        ) : (
          <section className="workspace-panel workspace-list">
            {watchlist.map((lot) => (
              <div className="workspace-list-row" key={lot.id}>
                <span>
                  <strong>
                    {language === "bn-BD" ? cropNamesBn[lot.crop] ?? t(lot.crop) : t(lot.crop)} · {t("Grade")}{" "}
                    {v(lot.grade)}
                  </strong>
                  <small>
                    {t(lot.district)} · {v(lot.quantityMon)} {t("mon")}
                  </small>
                </span>
                <em className="mono-figure">{v(taka(lot.pricePerMon))}</em>
                {/* No rate for this crop today means no verdict, rather than a guessed one. */}
                {lot.delta === null ? null : (
                  <span className={lot.delta > 0 ? "workspace-delta-pill over" : "workspace-delta-pill under"}>
                    {lot.delta === 0 ? t("at today's rate") : `${v(signedPercent(lot.delta))} ${t("vs. rate")}`}
                  </span>
                )}
                <button className="secondary-button" type="button" onClick={() => navigate(`/lot/${lot.id}`)}>
                  {t("Open lot")}
                </button>
              </div>
            ))}
          </section>
        )
      ) : null}

      {tab === "suppliers" ? (
        (dashboard?.suppliers.length ?? 0) === 0 ? (
          <EmptyState
            icon={Users}
            title={t("No suppliers yet")}
            hint={t("Farmers you buy from are collected here so you can reorder or message them directly.")}
          />
        ) : (
          <section className="workspace-panel workspace-list">
            {dashboard?.suppliers.map((supplier) => (
              <div className="workspace-list-row" key={supplier.name}>
                <span className="workspace-avatar small" aria-hidden="true">
                  {initialsOf(supplier.name)}
                </span>
                <span>
                  <strong>{supplier.name}</strong>
                  <small>
                    {t(supplier.district)} · {v(supplier.orderCount)}{" "}
                    {t(supplier.orderCount === 1 ? "order" : "orders")}
                  </small>
                </span>
                <em className="mono-figure">{v(taka(supplier.value))}</em>
                <button className="secondary-button" type="button" onClick={onOpenMessages}>
                  {t("Message")}
                </button>
              </div>
            ))}
          </section>
        )
      ) : null}

      {tab === "payments" ? (
        <div className="workspace-two-column">
          <LedgerPanel
            emptyHint="Payments and escrow releases appear here once you place your first order."
            rows={dashboard?.ledger ?? []}
            title="Ledger"
          />
          <section className="workspace-panel">
            <span className="workspace-kpi-eyebrow">{t("Payment method")}</span>
            {dashboard?.paymentMethod ? (
              <div className="workspace-account-row">
                <span className="workspace-account-badge blue" aria-hidden="true">
                  <CreditCard size={19} />
                </span>
                <span>
                  <strong>{t(dashboard.paymentMethod)}</strong>
                  <small>{t("Used on your most recent order")}</small>
                </span>
              </div>
            ) : (
              <p className="panel-note">{t("You have not paid for an order yet.")}</p>
            )}
            <p className="panel-note">
              {t("You pay into escrow when you order. The farmer is paid only after you confirm the delivery.")}
            </p>
          </section>
        </div>
      ) : null}

      {tab === "insights" ? (
        <div className="workspace-insights">
          <ValueMovedPerDay
            emptyHint="No completed orders to chart yet."
            series={dashboard?.daySeries ?? []}
            tone="blue"
            tradingDays={dashboard?.tradingDays ?? 0}
          />
          <ByCrop note="Crop cost, before transport and fee" slices={dashboard?.byCrop ?? []} />
          <section className="workspace-panel">
            <div className="workspace-panel-head">
              <h2>{t("How pricing works here")}</h2>
            </div>
            <p className="panel-prose">
              {t(
                "Every lot is compared to the district rate published each morning, so you can see what is fair before you order. The comparison on this page is on the crop subtotal only, excluding transport and the platform fee.",
              )}
            </p>
            <button className="secondary-button" type="button" onClick={() => navigate("/prices")}>
              {t("Open market rates")}
            </button>
          </section>
        </div>
      ) : null}
    </WorkspaceShell>
  );
}
