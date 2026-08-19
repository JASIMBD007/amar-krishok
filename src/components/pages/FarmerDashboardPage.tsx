import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { BarChart3, LayoutDashboard, Package, Plus, Sprout, Tag, Wallet } from "lucide-react";
import { ApiRequestError, fetchMyCropLots, fetchMyOrders, type BackendCropLot, type BackendOrder } from "../../api/auth";
import { fetchFarmerDashboard, type DashboardTask, type FarmerDashboard } from "../../api/dashboard";
import { fetchLotOffers, requestPayout } from "../../api/market";
import { useTranslate, useValueText } from "../../i18n";
import { taka } from "../../market/marketData";
import type { AuthUser } from "../../types";
import { ListLoading } from "../EmptyState";
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
import { FarmerListingsVsMarket, FarmerOffersPanel, type FarmerLotSummary } from "./farmer/FarmerMarketPanels";

/**
 * The farmer workspace: `/desk`. Everything about their lots, offers and money, in the same shell the
 * buyer's `/orders` uses.
 *
 * Every figure on this page comes from `GET /desk/dashboard`, which scopes to this farmer's own
 * orders and returns their own share of each: their lots' crop value, with the carrier's transport
 * and the platform's fee itemised as separate rows in the ledger so the farmer can see where the
 * buyer's money went. Nothing here re-derives a fee rate.
 */

type FarmerTab = "overview" | "listings" | "offers" | "sales" | "payouts" | "insights";

const TAB_META: Record<FarmerTab, { subtitle: string; title: string }> = {
  overview: { title: "Farmer dashboard", subtitle: "Everything about your lots, offers and money in one place" },
  listings: { title: "My listings", subtitle: "Every lot you have on the market, priced against today's rate" },
  offers: { title: "Offers", subtitle: "Buyers bidding below or above your asking price" },
  sales: { title: "Sales & escrow", subtitle: "Orders on your lots and where the money sits" },
  payouts: { title: "Payouts", subtitle: "What has been paid, what is on the way" },
  insights: { title: "Price insights", subtitle: "How your prices compare to your district over time" },
};

const TABS: FarmerTab[] = ["overview", "listings", "offers", "sales", "payouts", "insights"];

function tabFromSearch(value: string | null): FarmerTab {
  return TABS.find((tab) => tab === value) ?? "overview";
}

function numeric(value: string | number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function FarmerDashboardPage({
  onOpenMessages,
  user,
}: {
  /** Opens the header messenger, which is where conversations live in this app. */
  onOpenMessages: () => void;
  user: AuthUser | null;
}) {
  const navigate = useNavigate();
  const t = useTranslate();
  const v = useValueText();
  const [search, setSearch] = useSearchParams();
  const tab = tabFromSearch(search.get("tab"));

  const [dashboard, setDashboard] = useState<FarmerDashboard | null>(null);
  const [lots, setLots] = useState<BackendCropLot[]>([]);
  const [orders, setOrders] = useState<BackendOrder[]>([]);
  const [offerCounts, setOfferCounts] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [withdrawNotice, setWithdrawNotice] = useState("");
  const [isWithdrawing, setIsWithdrawing] = useState(false);

  const accessToken = user?.accessToken;

  const load = useCallback(() => {
    if (!accessToken) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    Promise.all([
      fetchFarmerDashboard(accessToken),
      fetchMyCropLots(accessToken).catch(() => [] as BackendCropLot[]),
      fetchMyOrders(accessToken).catch(() => [] as BackendOrder[]),
      fetchLotOffers(accessToken).catch(() => []),
    ])
      .then(([summary, myLots, myOrders, offers]) => {
        setDashboard(summary);
        setLots(myLots);
        setOrders(myOrders);
        // Open offers per lot, so the listings table can say "Live · 2 offers".
        setOfferCounts(
          offers
            .filter((offer) => offer.status === "OPEN")
            .reduce<Record<string, number>>((counts, offer) => {
              counts[offer.cropLot.id] = (counts[offer.cropLot.id] ?? 0) + 1;
              return counts;
            }, {}),
        );
        setError("");
      })
      .catch((requestError) => {
        setError(requestError instanceof ApiRequestError ? requestError.message : "Could not load your dashboard.");
      })
      .finally(() => setIsLoading(false));
  }, [accessToken]);

  useEffect(() => load(), [load]);

  const listings = useMemo<FarmerLotSummary[]>(
    () =>
      lots.map((lot) => ({
        active: lot.status.toUpperCase() === "ACTIVE",
        crop: lot.crop.name,
        district: lot.district.name,
        grade: lot.grade,
        id: lot.id,
        pricePerKg: numeric(lot.pricePerKg),
        quantityKg: numeric(lot.quantityKg),
      })),
    [lots],
  );

  const openTab = (next: FarmerTab) => {
    setSearch(next === "overview" ? {} : { tab: next }, { replace: false });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const act = (task: DashboardTask) => {
    if (task.action === "post") {
      navigate("/desk/post");
      return;
    }

    if (task.action === "market") {
      navigate("/marketplace");
      return;
    }

    openTab(task.action === "orders" || task.action === "payments" ? "sales" : (task.action as FarmerTab));
  };

  const withdraw = () => {
    if (!accessToken) {
      return;
    }

    setIsWithdrawing(true);
    requestPayout(accessToken)
      .then((result) => {
        setWithdrawNotice(
          `${t("Withdrawal requested")}: ${taka(result.amount)} · ${result.reference}. ${t("Payouts reach bKash within a few hours on working days.")}`,
        );
        load();
      })
      .catch((requestError) =>
        setWithdrawNotice(
          requestError instanceof ApiRequestError ? requestError.message : "Could not request a withdrawal.",
        ),
      )
      .finally(() => setIsWithdrawing(false));
  };

  const groups: Array<WorkspaceNavGroup<FarmerTab>> = [
    {
      title: "Selling",
      items: [
        { icon: LayoutDashboard, label: "Dashboard", tab: "overview" },
        { count: dashboard?.counts.listings, icon: Sprout, label: "My listings", tab: "listings" },
        { count: dashboard?.counts.offers, icon: Tag, label: "Offers", tab: "offers" },
        { count: dashboard?.counts.sales, icon: Package, label: "Sales & escrow", tab: "sales" },
      ],
    },
    {
      title: "Money",
      items: [
        { icon: Wallet, label: "Payouts", tab: "payouts" },
        { icon: BarChart3, label: "Price insights", tab: "insights" },
      ],
    },
  ];

  const kpis = dashboard?.kpis;
  const hasOrders = (kpis?.saleCount ?? 0) > 0;

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
      primaryAction={{ icon: Plus, label: "Post a crop", onClick: () => navigate("/desk/post"), tone: "red" }}
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
              eyebrow="Ready to withdraw"
              qualifier="Your share of the orders already paid out"
              value={taka(kpis.withdrawable)}
              footnote={
                kpis.canWithdraw ? null : t("Money lands here after a buyer confirms delivery.")
              }
            >
              {kpis.canWithdraw ? (
                <button className="workspace-kpi-action" disabled={isWithdrawing} type="button" onClick={withdraw}>
                  {t(isWithdrawing ? "Requesting" : "Withdraw to bKash")}
                </button>
              ) : null}
            </KpiTile>
            <KpiTile
              eyebrow="In escrow"
              value={taka(kpis.inEscrow)}
              footnote={`${t("Across")} ${v(kpis.liveOrderCount)} ${t(kpis.liveOrderCount === 1 ? "live order" : "live orders")}`}
            />
            <KpiTile
              eyebrow="Active listings"
              value={String(kpis.activeListings)}
              footnote={`${v(kpis.listedMon.toLocaleString("en-IN"))} ${t("mon on the market")}`}
            />
            <KpiTile
              eyebrow="This season"
              value={taka(kpis.season)}
              footnote={
                kpis.saleCount
                  ? `${v(kpis.saleCount)} ${t(kpis.saleCount === 1 ? "sale so far" : "sales so far")}`
                  : t("First season on AmarKrishok")
              }
            />
          </div>

          {withdrawNotice ? (
            <p className="soft-notice" role="status">
              {withdrawNotice}
            </p>
          ) : null}

          <div className="workspace-overview-columns">
            <div>
              <NeedsYouFirst onAct={act} tasks={dashboard.tasks} />
              <ValueMovedPerDay
                emptyHint="Nothing has moved yet — your first sale will show up here."
                series={dashboard.daySeries}
                tradingDays={dashboard.tradingDays}
              />
            </div>
            <div>
              <WhereOrdersSit hasOrders={hasOrders} stages={dashboard.stages} />
              <ByCrop note="Value on the market" slices={dashboard.byCrop} />
              <NextMoneyMovement
                emptyHint="No order is waiting to be paid out."
                movement={dashboard.nextMovement}
                whose="Your share of"
              />
            </div>
          </div>
        </div>
      ) : null}

      {tab === "listings" ? (
        <FarmerListingsVsMarket
          lots={listings}
          offerCounts={offerCounts}
          onEditLot={(id) => navigate(`/desk/listings/${encodeURIComponent(id)}`)}
          onPostCrop={() => navigate("/desk/post")}
        />
      ) : null}

      {tab === "offers" ? <FarmerOffersPanel user={user} /> : null}

      {tab === "sales" ? (
        <WorkspaceOrderTable
          emptyAction={
            <button className="primary-button" type="button" onClick={() => navigate("/desk/post")}>
              {t("Post a crop")}
            </button>
          }
          emptyHint="When a buyer orders one of your lots, the order and its escrow appear here."
          emptyTitle="No sales yet"
          orders={orders}
          valueLabel="Your share"
          valueOf={(order) => order.viewerShare ?? 0}
        />
      ) : null}

      {tab === "payouts" ? (
        <div className="workspace-two-column">
          <LedgerPanel
            emptyHint="Escrow, payouts and fees all appear here once your first lot sells."
            rows={dashboard?.ledger ?? []}
            title="Ledger"
          />
          <section className="workspace-panel">
            <span className="workspace-kpi-eyebrow">{t("Payout account")}</span>
            {dashboard?.payoutAccount ? (
              <div className="workspace-account-row">
                <span className="workspace-account-badge" aria-hidden="true">
                  {dashboard.payoutAccount.label.slice(0, 2)}
                </span>
                <span>
                  <strong className="mono-figure">{v(dashboard.payoutAccount.masked)}</strong>
                  <small>{t(dashboard.payoutAccount.label)}</small>
                </span>
              </div>
            ) : (
              <p className="panel-note">{t("No payout account on file yet.")}</p>
            )}
            <button className="secondary-button" type="button" onClick={() => navigate("/profile")}>
              {t(dashboard?.payoutAccount ? "Change account" : "Add a payout account")}
            </button>
            <p className="panel-note">{t("Changing the account pauses payouts for 24 hours as a fraud check.")}</p>
          </section>
        </div>
      ) : null}

      {tab === "insights" ? (
        <div className="workspace-insights">
          <ValueMovedPerDay
            emptyHint="No completed deals to chart yet."
            series={dashboard?.daySeries ?? []}
            tone="blue"
            tradingDays={dashboard?.tradingDays ?? 0}
          />
          <ByCrop note="Value on the market" slices={dashboard?.byCrop ?? []} />
          <section className="workspace-panel">
            <div className="workspace-panel-head">
              <h2>{t("How pricing works here")}</h2>
            </div>
            <p className="panel-prose">
              {t(
                "Every lot is compared to the district rate published each morning. Inside the fair range it carries a green badge; above it, an amber one.",
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
