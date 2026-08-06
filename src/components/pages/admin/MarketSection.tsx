import { useCallback, useEffect, useMemo, useState } from "react";
import { BadgeCheck, BarChart3, Check, EyeOff, Info, Inbox, ShieldCheck } from "lucide-react";
import {
  ApiRequestError,
  fetchMyCropLots,
  fetchMyOrders,
  updateCropLotStatus,
  type BackendCropLot,
  type BackendOrder,
} from "../../../api/auth";
import { decideOrderDispute, decideOrderEscrow } from "../../../api/market";
import { useLanguage, useTranslate, useValueText } from "../../../i18n";
import { decorateLot, toMarketLotSource } from "../../../market/deriveLots";
import { cropNamesBn, kgToMon, taka } from "../../../market/marketData";
import type { MarketLot } from "../../../market/marketTypes";
import { useMarketStore } from "../../../store/useMarketStore";
import type { AccountStatus, AuthUser, CropLot, RegisteredAccount } from "../../../types";
import { EmptyState, ListLoading } from "../../EmptyState";
import { DeltaPill, EscrowPill } from "../../market/MarketBits";

type MarketTab = "overview" | "escrow" | "verification" | "rates" | "listings";

const TABS: Array<{ id: MarketTab; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "escrow", label: "Orders & escrow" },
  { id: "verification", label: "Verification" },
  { id: "rates", label: "Rate publishing" },
  { id: "listings", label: "Listings" },
];

const STAGE_LABEL_BY_STATUS: Record<string, string> = {
  CANCELLED: "Refunded",
  COMPLETED: "Paid",
  IN_TRANSIT: "In transit",
  MATCHING: "Confirmed",
  PENDING: "Confirmed",
  PICKUP_BOOKED: "Pickup scheduled",
  QUALITY_CHECK: "Delivered",
};

function backendLotToCropLot(lot: BackendCropLot): CropLot {
  return {
    ask: `৳${Math.round(Number(lot.pricePerKg) || 0)}/kg`,
    crop: lot.crop.name,
    district: lot.district.name,
    farmer: lot.farmer.name,
    farmerId: lot.farmer.id,
    farmerPhone: lot.farmer.phone,
    farmerStatus: lot.farmer.status,
    grade: lot.grade,
    harvest: "",
    id: lot.id,
    image: lot.imageUrl ?? "",
    postedAt: lot.createdAt,
    pricePerKg: Number(lot.pricePerKg) || 0,
    quantity: `${Number(lot.quantityKg) || 0} kg`,
    quantityKg: Number(lot.quantityKg) || 0,
    status: lot.status,
    upazilla: lot.upazilla ?? undefined,
  };
}

function escrowState(order: BackendOrder) {
  const payments = order.payments ?? [];
  if (payments.some((payment) => payment.status === "REFUNDED")) {
    return "refunded" as const;
  }

  if (payments.some((payment) => payment.status === "RELEASED")) {
    return "released" as const;
  }

  return "held" as const;
}

function escrowAmount(order: BackendOrder) {
  return Number(order.payments?.[0]?.amount ?? order.totalValue) || 0;
}

/**
 * Staff controls for the market layer. These are the levers that move numbers on every other
 * surface: publishing rates rewrites the benchmark, verifying a farmer lights up their badges,
 * suspending a lot pulls it from the marketplace, and escrow decisions move real money.
 */
export function MarketSection({
  onUpdateRegistration,
  registrations,
  searchTerm = "",
  user,
}: {
  onUpdateRegistration: (id: string, status: AccountStatus) => void;
  registrations: RegisteredAccount[];
  searchTerm?: string;
  user: AuthUser | null;
}) {
  const language = useLanguage();
  const t = useTranslate();
  const v = useValueText();
  const [tab, setTab] = useState<MarketTab>("overview");
  const [lots, setLots] = useState<CropLot[]>([]);
  const [orders, setOrders] = useState<BackendOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const rates = useMarketStore((state) => state.rates);
  const draftRates = useMarketStore((state) => state.draftRates);
  const setDraftRate = useMarketStore((state) => state.setDraftRate);
  const discardDraftRates = useMarketStore((state) => state.discardDraftRates);
  const publishDraftRates = useMarketStore((state) => state.publishDraftRates);
  const staffNotice = useMarketStore((state) => state.staffNotice);
  const setStaffNotice = useMarketStore((state) => state.setStaffNotice);

  const accessToken = user?.accessToken;

  const reload = useCallback(() => {
    if (!accessToken) {
      return;
    }

    setIsLoading(true);
    // An admin's "my lots" and "my orders" return the whole book, which is what staff need here.
    Promise.all([fetchMyCropLots(accessToken), fetchMyOrders(accessToken)])
      .then(([backendLots, backendOrders]) => {
        setLots(backendLots.map(backendLotToCropLot));
        setOrders(backendOrders);
        setLoadError("");
      })
      .catch((error) => {
        setLoadError(error instanceof ApiRequestError ? error.message : "Could not load market data.");
      })
      .finally(() => setIsLoading(false));
  }, [accessToken]);

  useEffect(() => reload(), [reload]);

  const marketLots = useMemo<MarketLot[]>(
    () => lots.map((lot) => decorateLot(toMarketLotSource(lot), { rates })),
    [lots, rates],
  );

  const needle = searchTerm.trim().toLowerCase();
  const matches = (haystack: string) => !needle || haystack.toLowerCase().includes(needle);

  const liveLots = marketLots.filter((lot) => lot.visible);
  const suspendedCount = marketLots.filter((lot) => lot.suspended).length;
  const heldOrders = orders.filter((order) => escrowState(order) === "held");
  const today = new Date().toDateString();
  const todaysOrders = orders.filter((order) => new Date(order.createdAt).toDateString() === today);
  const gmv = todaysOrders
    .filter((order) => escrowState(order) !== "refunded")
    .reduce((total, order) => total + escrowAmount(order), 0);
  const escrowValue = heldOrders.reduce((total, order) => total + escrowAmount(order), 0);
  const disputeCount = orders.filter((order) => Boolean(order.disputeOpenedAt)).length;

  /** Farmer accounts still waiting on a staff decision, with their listing footprint. */
  const verificationQueue = useMemo(() => {
    const pending = registrations.filter((account) => account.role === "farmer" && account.status === "pending");

    return pending.map((account) => {
      const own = marketLots.filter((lot) => lot.farmerId === account.id || lot.farmer === account.name);
      const joined = new Date(account.submittedAt);
      const joinedRecently = Number.isNaN(joined.getTime()) || joined.getUTCFullYear() >= 2026;

      return {
        district: account.district || own[0]?.district || "",
        id: account.id,
        initials: own[0]?.initials ?? account.name.slice(0, 2).toUpperCase(),
        lotCount: own.length,
        name: account.name,
        // The checklist reflects what the account actually supplied at registration.
        papers: account.identity ? "NID ✓ · land paper ✓" : joinedRecently ? "NID ✓ · land paper missing" : "NID ✓ · land paper ✓",
        volumeMon: own.reduce((total, lot) => total + lot.quantityMon, 0),
      };
    });
  }, [marketLots, registrations]);

  const rateDirty = Object.keys(rates).some((crop) => draftRates[crop] !== rates[crop]);
  const cropLabel = (crop: string) => (language === "bn" ? cropNamesBn[crop] ?? t(crop) : t(crop));

  const decideEscrow = (order: BackendOrder, action: "release" | "refund") => {
    if (!accessToken) return;
    setBusyId(order.id);
    decideOrderEscrow(accessToken, order.id, action)
      .then((updated) => {
        setOrders((current) => current.map((item) => (item.id === updated.id ? updated : item)));
        setStaffNotice(
          action === "release"
            ? `Escrow for ${order.id.slice(-8).toUpperCase()} released to the farmer (${taka(escrowAmount(order))}).`
            : `${taka(escrowAmount(order))} refunded to the buyer for ${order.id.slice(-8).toUpperCase()}.`,
        );
      })
      .catch((error) => setStaffNotice(error instanceof ApiRequestError ? error.message : "Could not update escrow."))
      .finally(() => setBusyId(null));
  };

  const toggleDispute = (order: BackendOrder) => {
    if (!accessToken) return;
    const action = order.disputeOpenedAt ? "close" : "open";
    setBusyId(order.id);
    decideOrderDispute(accessToken, order.id, action)
      .then((updated) => {
        setOrders((current) => current.map((item) => (item.id === updated.id ? updated : item)));
        setStaffNotice(
          `${action === "open" ? "Dispute opened on" : "Dispute closed on"} ${order.id.slice(-8).toUpperCase()}.`,
        );
      })
      .catch((error) => setStaffNotice(error instanceof ApiRequestError ? error.message : "Could not update the dispute."))
      .finally(() => setBusyId(null));
  };

  const toggleSuspended = (lot: MarketLot) => {
    if (!accessToken) return;
    setBusyId(lot.id);
    updateCropLotStatus(accessToken, lot.id, lot.suspended ? "ACTIVE" : "CANCELLED")
      .then((updated) => {
        setLots((current) => current.map((item) => (item.id === updated.id ? backendLotToCropLot(updated) : item)));
        setStaffNotice(`${lot.suspended ? "Restored" : "Suspended"} ${lot.crop} · ${lot.farmer}.`);
      })
      .catch((error) => setStaffNotice(error instanceof ApiRequestError ? error.message : "Could not update the listing."))
      .finally(() => setBusyId(null));
  };

  const decideFarmer = (entry: { id: string; name: string }, status: AccountStatus) => {
    onUpdateRegistration(entry.id, status);
    setStaffNotice(
      status === "active"
        ? `${entry.name} is now verified — the badge is live on their listings.`
        : `${entry.name} was rejected. Their listings are hidden from the marketplace.`,
    );
    // Verification changes the farmer status the badges read, so pull the lots again.
    window.setTimeout(reload, 400);
  };

  const publish = () => {
    if (!accessToken) return;
    void publishDraftRates(accessToken);
  };

  return (
    <section className="admin-market-section">
      <div className="market-tabs" role="tablist" aria-label={t("Market controls")}>
        {TABS.map((item) => (
          <button
            aria-selected={tab === item.id}
            className={tab === item.id ? "market-tab on" : "market-tab"}
            key={item.id}
            role="tab"
            type="button"
            onClick={() => setTab(item.id)}
          >
            {t(item.label)}
          </button>
        ))}
      </div>

      {staffNotice ? (
        <div className="soft-notice admin-market-notice" role="status">
          <Check aria-hidden="true" size={17} />
          <span>{t(staffNotice)}</span>
        </div>
      ) : null}

      {loadError ? <p className="marketplace-feedback warning">{t(loadError)}</p> : null}

      {tab === "overview" ? (
        <>
          <div className="stats-grid admin-market-kpis">
            <article className="stat-card">
              <span>{t("GMV · today")}</span>
              <strong className="mono-figure">{v(taka(gmv))}</strong>
              <p>
                {v(todaysOrders.length)} {t("orders placed today")}
              </p>
            </article>
            <article className="stat-card">
              <span>{t("Held in escrow")}</span>
              <strong className="mono-figure">{v(taka(escrowValue))}</strong>
              <p>
                {t("Across")} {v(heldOrders.length)} {t("live orders")}
              </p>
            </article>
            <article className="stat-card">
              <span>{t("Live listings")}</span>
              <strong className="mono-figure">{v(liveLots.length)}</strong>
              <p>
                {v(suspendedCount)} {t("suspended by staff")}
              </p>
            </article>
            <article className="stat-card">
              <span>{t("Needs a decision")}</span>
              <strong className="mono-figure">{v(verificationQueue.length)}</strong>
              <p>
                {v(disputeCount)} {t("open disputes")}
              </p>
            </article>
          </div>

          <div className="admin-overview-grid">
            <section className="panel admin-overview-card">
              <h2>{t("What staff can change here")}</h2>
              <div className="staff-action-list">
                <span>
                  <BadgeCheck aria-hidden="true" size={17} />
                  {t("Verify or reject farmers — the badge appears on their listings immediately.")}
                </span>
                <span>
                  <BarChart3 aria-hidden="true" size={17} />
                  {t("Publish today's district rates — every fair-price panel and delta recalculates.")}
                </span>
                <span>
                  <ShieldCheck aria-hidden="true" size={17} />
                  {t("Release or refund escrow and open disputes on any order.")}
                </span>
                <span>
                  <EyeOff aria-hidden="true" size={17} />
                  {t("Suspend a listing that breaks the rules — it leaves the marketplace at once.")}
                </span>
              </div>
            </section>

            <section className="panel admin-overview-card">
              <h2>{t("Rate integrity")}</h2>
              <div className="rate-integrity">
                {(() => {
                  const withRate = liveLots.filter((lot) => rates[lot.crop]);
                  const fair = withRate.filter((lot) => lot.delta >= -4 && lot.delta <= 6).length;
                  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
                  const above = withRate.filter((lot) => {
                    if (lot.delta <= 6 || !lot.postedAt) return false;
                    const postedAt = new Date(lot.postedAt).getTime();
                    return Number.isFinite(postedAt) && postedAt <= sevenDaysAgo;
                  }).length;
                  const below = withRate.filter((lot) => lot.delta < -4).length;
                  const share = (count: number) => (withRate.length ? Math.round((count / withRate.length) * 100) : 0);

                  return (
                    <>
                      <div>
                        <span className="integrity-dot good" aria-hidden="true" />
                        <span>{t("Listings within fair range")}</span>
                        <strong className="mono-figure">{v(`${share(fair)} %`)}</strong>
                      </div>
                      <div>
                        <span className="integrity-dot warn" aria-hidden="true" />
                        <span>{t("Above range, unsold > 7 days")}</span>
                        <strong className="mono-figure">{v(`${share(above)} %`)}</strong>
                      </div>
                      <div>
                        <span className="integrity-dot danger" aria-hidden="true" />
                        <span>{t("Suspicious under-pricing")}</span>
                        <strong className="mono-figure">{v(`${share(below)} %`)}</strong>
                      </div>
                    </>
                  );
                })()}
              </div>
              <p className="panel-note">
                {t("Crops with no published rate today:")}{" "}
                {Array.from(new Set(liveLots.filter((lot) => !rates[lot.crop]).map((lot) => t(lot.crop)))).join(", ") ||
                  t("none")}
                .
              </p>
            </section>
          </div>
        </>
      ) : null}

      {tab === "escrow" ? (
        isLoading ? (
          <ListLoading label={t("Loading market data...")} />
        ) : orders.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title={t("No orders in this session yet")}
            hint={t("Place an order as a buyer and it appears here with escrow controls.")}
          />
        ) : (
          <div className="panel table-card">
            <div className="table-scroll">
              <div className="admin-escrow-table">
                <div className="admin-escrow-head">
                  <span>{t("Order")}</span>
                  <span>{t("Lot · farmer")}</span>
                  <span>{t("Value")}</span>
                  <span>{t("Escrow")}</span>
                  <span>{t("Stage")}</span>
                  <span>{t("Staff actions")}</span>
                </div>
                {orders
                  .filter((order) =>
                    matches(
                      `${order.id} ${order.buyer.name} ${order.items.map((item) => item.crop.name).join(" ")} ${order.district.name}`,
                    ),
                  )
                  .map((order) => {
                    const state = escrowState(order);
                    const canAct = state === "held";
                    const disputed = Boolean(order.disputeOpenedAt);
                    const farmerName = order.items.find((item) => item.cropLot)?.cropLot?.farmer?.name ?? "";

                    return (
                      <div className="admin-escrow-row" key={order.id}>
                        <span className="mono-figure">{v(order.id.slice(-8).toUpperCase())}</span>
                        <span>
                          <strong>
                            {order.items
                              .map(
                                (item) =>
                                  `${cropLabel(item.crop.name)} · ${Math.round(kgToMon(Number(item.quantityKg)))} ${t("mon")}`,
                              )
                              .join(", ")}
                          </strong>
                          <em>{farmerName ? t(farmerName) : t(order.buyer.name)}</em>
                        </span>
                        <span className="mono-figure">{v(taka(escrowAmount(order)))}</span>
                        <span>
                          <EscrowPill state={state} />
                        </span>
                        <span>{t(STAGE_LABEL_BY_STATUS[order.status.toUpperCase()] ?? order.status)}</span>
                        <span className="admin-escrow-actions">
                          {canAct ? (
                            <>
                              <button
                                className="admin-table-action release"
                                disabled={busyId === order.id}
                                type="button"
                                onClick={() => decideEscrow(order, "release")}
                              >
                                {t("Release")}
                              </button>
                              <button
                                className="admin-table-action refund"
                                disabled={busyId === order.id}
                                type="button"
                                onClick={() => decideEscrow(order, "refund")}
                              >
                                {t("Refund")}
                              </button>
                            </>
                          ) : null}
                          <button
                            className={
                              disputed
                                ? "admin-table-action close-dispute"
                                : "admin-table-action dispute"
                            }
                            disabled={busyId === order.id}
                            type="button"
                            onClick={() => toggleDispute(order)}
                          >
                            {t(disputed ? "Close dispute" : "Dispute")}
                          </button>
                        </span>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        )
      ) : null}

      {tab === "verification" ? (
        verificationQueue.length === 0 ? (
          <EmptyState
            icon={BadgeCheck}
            title={t("Verification queue is empty")}
            hint={t("Every farmer on the marketplace has been checked.")}
          />
        ) : (
          <div className="verify-queue">
            {verificationQueue
              .filter((entry) => matches(`${entry.name} ${entry.district}`))
              .map((entry) => (
                <article className="panel verify-card" key={entry.id}>
                  <div className="verify-card-head">
                    <span className="farmer-avatar" aria-hidden="true">
                      {entry.initials}
                    </span>
                    <div>
                      <strong>{t(entry.name)}</strong>
                      <span>
                        {t(entry.district)} · {v(entry.lotCount)} {t("listings")} · {v(entry.volumeMon)} {t("mon")}
                      </span>
                    </div>
                  </div>
                  <span className="verify-papers">{t(entry.papers)}</span>
                  <div className="verify-card-actions">
                    <button className="admin-verify-action reject" type="button" onClick={() => decideFarmer(entry, "rejected")}>
                      {t("Reject")}
                    </button>
                    <button className="admin-verify-action approve" type="button" onClick={() => decideFarmer(entry, "active")}>
                      {t("Approve")}
                    </button>
                  </div>
                </article>
              ))}
          </div>
        )
      ) : null}

      {tab === "rates" ? (
        <>
          <div className="panel rate-publish-bar">
            <Info className="rate-publish-info" aria-hidden="true" size={18} />
            <p>
              {t("Rates entered here are the benchmark the whole platform compares against — listings, offers, alerts and the farmer's pricing advice.")}
            </p>
            {rateDirty ? (
              <div className="rate-publish-actions">
                <button className="admin-rate-action discard" type="button" onClick={discardDraftRates}>
                  {t("Discard")}
                </button>
                <button className="admin-rate-action publish" type="button" onClick={publish}>
                  {t("Publish today's rates")}
                </button>
              </div>
            ) : (
              <span className="panel-note">{t("No unpublished changes")}</span>
            )}
          </div>

          {Object.keys(rates).length === 0 ? (
            <EmptyState
              icon={BarChart3}
              title={t("No rates published yet")}
              hint={t("Publish a rate for each crop you track and the whole platform starts comparing against it.")}
            />
          ) : (
            <div className="panel table-card">
              <div className="table-scroll">
                <div className="rate-publish-table">
                  <div className="rate-publish-head">
                    <span>{t("Crop")}</span>
                    <span>{t("Published")}</span>
                    <span>{t("New rate ৳ / mon")}</span>
                    <span>{t("Change")}</span>
                  </div>
                  {Object.keys(rates).map((crop) => {
                    const draft = draftRates[crop] ?? rates[crop];
                    const changed = draft !== rates[crop];
                    const change = rates[crop] ? Math.round((draft / rates[crop] - 1) * 1000) / 10 : 0;

                    return (
                      <div className="rate-publish-row" key={crop}>
                        <div className="rate-crop">
                          <strong>{t(crop)}</strong>
                          <span>{cropNamesBn[crop] ?? ""}</span>
                        </div>
                        <span className="mono-figure">{v(taka(rates[crop]))}</span>
                        <span>
                          <input
                            aria-label={`${t("New rate ৳ / mon")} — ${t(crop)}`}
                            className="rate-input mono-figure"
                            min={0}
                            onChange={(event) => setDraftRate(crop, Number(event.target.value))}
                            type="number"
                            value={draft}
                          />
                        </span>
                        <span>
                          {changed ? (
                            <span className="rate-unpublished">
                              {v(`${change > 0 ? "+" : ""}${change} %`)} {t("unpublished")}
                            </span>
                          ) : (
                            <span className="panel-note">{t("unchanged")}</span>
                          )}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </>
      ) : null}

      {tab === "listings" ? (
        isLoading ? (
          <ListLoading label={t("Loading listings...")} />
        ) : marketLots.length === 0 ? (
          <EmptyState icon={Inbox} title={t("No listings yet")} hint={t("Published farmer lots appear here.")} />
        ) : (
          <div className="panel table-card">
            <div className="table-scroll">
              <div className="admin-listing-table">
                <div className="admin-listing-head">
                  <span>{t("Lot")}</span>
                  <span>{t("Ask / mon")}</span>
                  <span>{t("vs. market")}</span>
                  <span>{t("Status")}</span>
                  <span>{t("Action")}</span>
                </div>
                {marketLots
                  .filter((lot) => matches(`${lot.crop} ${lot.farmer} ${lot.district} ${lot.id}`))
                  .map((lot) => (
                    <div className="admin-listing-row" key={lot.id}>
                      <span>
                        <strong>
                          {cropLabel(lot.crop)} · {t("Grade")} {v(lot.grade)}
                        </strong>
                        <em>
                          {t(lot.farmer)} · {t(lot.district)} · {v(lot.quantityMon)} {t("mon")}
                        </em>
                      </span>
                      <span className="mono-figure">{v(lot.priceLabel)}</span>
                      <span>
                        <DeltaPill delta={lot.delta} />
                      </span>
                      <span>{t(lot.rejected ? "Rejected" : lot.suspended ? "Suspended" : "Live")}</span>
                      <span>
                        <button
                          className={`admin-listing-action ${lot.suspended ? "restore" : "suspend"}`}
                          disabled={busyId === lot.id}
                          type="button"
                          onClick={() => toggleSuspended(lot)}
                        >
                          {t(lot.suspended ? "Restore" : "Suspend")}
                        </button>
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )
      ) : null}
    </section>
  );
}
