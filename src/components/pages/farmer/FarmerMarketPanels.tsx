import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { BadgeCheck, Clock3, Handshake, Sprout, TrendingUp, WalletCards, X } from "lucide-react";
import { ApiRequestError } from "../../../api/auth";
import { fetchLotOffers, requestPayout, respondToLotOffer, type BackendLotOffer } from "../../../api/market";
import { useLanguage, useTranslate, useValueText } from "../../../i18n";
import { decorateLot, farmerInitials } from "../../../market/deriveLots";
import { cropNamesBn, kgToMon, perKgToPerMon, taka } from "../../../market/marketData";
import type { MarketLotSource } from "../../../market/marketTypes";
import { useMarketStore } from "../../../store/useMarketStore";
import type { AuthUser } from "../../../types";
import { EmptyState, ListLoading } from "../../EmptyState";
import { KpiCard } from "../../KpiCard";
import { DeltaPill } from "../../market/MarketBits";

export type FarmerLotSummary = {
  id: string;
  crop: string;
  grade: string;
  district: string;
  pricePerKg: number;
  quantityKg: number;
  active: boolean;
};

export type FarmerEscrowSummary = {
  /** ৳ already released to this farmer, net of transport and the platform fee. */
  released: number;
  releasedCount: number;
  /** ৳ still held in escrow across live orders on this farmer's lots. */
  held: number;
  heldCount: number;
  orderCount: number;
  grossValue: number;
};

/**
 * The money side of the farmer desk. Every figure comes from the backend's payment and payout
 * records, so a newly registered farmer sees ৳ 0 rather than an inherited demo balance.
 */
export function FarmerEscrowKpis({
  activeListings,
  listedMon,
  summary,
  user,
}: {
  activeListings: number;
  listedMon: number;
  summary: FarmerEscrowSummary;
  user: AuthUser | null;
}) {
  const t = useTranslate();
  const v = useValueText();
  const [withdrawNotice, setWithdrawNotice] = useState("");
  const [isWithdrawing, setIsWithdrawing] = useState(false);

  const withdraw = () => {
    if (!user?.accessToken) {
      return;
    }

    setIsWithdrawing(true);
    requestPayout(user.accessToken)
      .then((result) =>
        setWithdrawNotice(
          `${t("Withdrawal requested")}: ${taka(result.amount)} · ${result.reference}. ${t("Payouts reach bKash within a few hours on working days.")}`,
        ),
      )
      .catch((error) =>
        setWithdrawNotice(error instanceof ApiRequestError ? error.message : "Could not request a withdrawal."),
      )
      .finally(() => setIsWithdrawing(false));
  };

  return (
    <>
      <section className="stats-grid kpi-grid farmer-escrow-grid" aria-label={t("Escrow and payouts")}>
        <article className="stat-card dashboard-stat kpi-card">
          <div className="kpi-top">
            <span className="kpi-icon">
              <WalletCards size={17} />
            </span>
          </div>
          <span className="kpi-label">{t("Ready to withdraw")}</span>
          <strong className="kpi-value mono-figure">{v(taka(summary.released))}</strong>
          <button
            className="primary-button full withdraw-button"
            disabled={isWithdrawing || summary.released <= 0}
            type="button"
            onClick={withdraw}
          >
            {t(isWithdrawing ? "Requesting" : "Withdraw to bKash")}
          </button>
        </article>
        <KpiCard
          icon={Handshake}
          label={t("In escrow")}
          value={v(taka(summary.held))}
          detail={`${t("Across")} ${v(summary.heldCount)} ${t("live orders")}`}
        />
        <KpiCard
          icon={Sprout}
          label={t("Active listings")}
          value={v(activeListings)}
          detail={`${v(listedMon.toLocaleString("en-IN"))} ${t("mon on the market")}`}
        />
        <KpiCard
          icon={TrendingUp}
          label={t("This season")}
          value={v(taka(summary.grossValue))}
          detail={summary.orderCount ? t("Gross value of your orders") : t("First season on AmarKrishok")}
        />
      </section>
      {withdrawNotice ? (
        <p className="soft-notice" role="status">
          {withdrawNotice}
        </p>
      ) : null}
    </>
  );
}

/** The desk header's identity line: who this is, where, and whether staff have verified them. */
export function FarmerDeskBadge({ district, verified }: { district: string; verified: boolean }) {
  const t = useTranslate();

  return (
    <span className="desk-identity">
      {district ? t(district) : null}
      <span className={verified ? "verify-badge verified" : "verify-badge pending"}>
        {verified ? <BadgeCheck aria-hidden="true" size={11} /> : <Clock3 aria-hidden="true" size={11} />}
        {t(verified ? "Verified" : "Verification in progress")}
      </span>
    </span>
  );
}

/** My listings against today's district rate — the farmer's own version of the fair-price check. */
export function FarmerListingsVsMarket({ lots }: { lots: FarmerLotSummary[] }) {
  const language = useLanguage();
  const t = useTranslate();
  const v = useValueText();
  const rates = useMarketStore((state) => state.rates);

  const rows = useMemo(
    () =>
      lots.map((lot) => {
        const source: MarketLotSource = {
          completedOrders: 0,
          crop: lot.crop,
          district: lot.district,
          farmer: "",
          farmingSince: 2020,
          grade: lot.grade.replace(/^Grade\s+/i, "") || "B",
          id: lot.id,
          pricePerMon: perKgToPerMon(lot.pricePerKg),
          quantityMon: Math.max(1, Math.round(kgToMon(lot.quantityKg))),
          rating: 0,
          transportIncluded: false,
        };
        return { ...decorateLot(source, { rates }), active: lot.active };
      }),
    [lots, rates],
  );

  return (
    <section className="panel farmer-rail-panel" id="farmer-market-check">
      <div className="panel-header">
        <div>
          <span>{t("My listings")}</span>
          <h3>{t("Price vs. today's district rate")}</h3>
        </div>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={Sprout}
          title={t("No listings yet")}
          hint={t("Post your first crop and buyers in your district see it immediately.")}
        />
      ) : (
        <div className="listing-vs-market">
          <div className="listing-vs-market-head">
            <span>{t("Lot")}</span>
            <span>{t("Ask / mon")}</span>
            <span>{t("vs. market")}</span>
            <span>{t("Status")}</span>
          </div>
          {rows.map((row) => (
            <div className="listing-vs-market-row" key={row.id}>
              <div>
                <strong>
                  {language === "bn-BD" ? cropNamesBn[row.crop] ?? t(row.crop) : t(row.crop)} · {t("Grade")} {v(row.grade)}
                </strong>
                <span>
                  {v(row.quantityMon)} {t("mon")} · {t(row.district)}
                </span>
              </div>
              <span className="mono-figure">{v(row.priceLabel)}</span>
              <span>
                <DeltaPill delta={row.delta} />
              </span>
              <span className="listing-vs-market-status">{row.active ? t("Live") : t("Paused")}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

/** Offers a buyer sent on this farmer's lots, answered here and recorded by the backend. */
export function FarmerOffersPanel({ user }: { user: AuthUser | null }) {
  const language = useLanguage();
  const t = useTranslate();
  const v = useValueText();
  const rates = useMarketStore((state) => state.rates);
  const offerNotice = useMarketStore((state) => state.offerNotice);
  const setOfferNotice = useMarketStore((state) => state.setOfferNotice);
  const clearOfferNotice = useMarketStore((state) => state.clearOfferNotice);

  const [offers, setOffers] = useState<BackendLotOffer[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [respondingId, setRespondingId] = useState<string | null>(null);

  const reload = useCallback(() => {
    if (!user?.accessToken) {
      setOffers([]);
      return;
    }

    setIsLoading(true);
    fetchLotOffers(user.accessToken)
      .then((result) => {
        setOffers(result);
        setError("");
      })
      .catch((requestError) => {
        setOffers([]);
        setError(requestError instanceof ApiRequestError ? requestError.message : "Could not load buyer offers.");
      })
      .finally(() => setIsLoading(false));
  }, [user?.accessToken]);

  useEffect(() => reload(), [reload]);

  const openOffers = useMemo(() => offers.filter((offer) => offer.status === "OPEN"), [offers]);

  const respond = (offer: BackendLotOffer, action: "accept" | "decline") => {
    if (!user?.accessToken) {
      return;
    }

    setRespondingId(offer.id);
    respondToLotOffer(user.accessToken, offer.id, action)
      .then((updated) => {
        setOffers((current) => current.map((item) => (item.id === updated.id ? updated : item)));
        setOfferNotice(
          action === "accept"
            ? `Offer from ${offer.buyer.name} accepted at ${taka(perKgToPerMon(Number(offer.pricePerKg)))} / mon. The buyer now pays into escrow.`
            : `Offer from ${offer.buyer.name} declined.`,
        );
      })
      .catch((requestError) => {
        setError(requestError instanceof ApiRequestError ? requestError.message : "Could not answer this offer.");
      })
      .finally(() => setRespondingId(null));
  };

  return (
    <section className="panel farmer-rail-panel" id="farmer-offers">
      <div className="panel-header">
        <div>
          <span>{t("Buyer offers")}</span>
          <h3>{t("Offers waiting")}</h3>
        </div>
        <strong className="mono-figure offers-count">{v(openOffers.length)}</strong>
      </div>

      {offerNotice ? (
        <div className="soft-notice dismissable" role="status">
          <span>{t(offerNotice)}</span>
          <button className="icon-button" aria-label={t("Dismiss")} type="button" onClick={clearOfferNotice}>
            <X size={16} />
          </button>
        </div>
      ) : null}
      {error ? <p className="soft-notice warn">{t(error)}</p> : null}
      {isLoading ? <ListLoading label={t("Loading buyer offers...")} /> : null}

      {!isLoading && openOffers.length === 0 ? (
        <p className="panel-note">{t("No open offers. Buyers can still order at your asking price.")}</p>
      ) : null}

      {openOffers.length > 0 ? (
        <div className="offer-list">
          {openOffers.map((offer) => {
            const pricePerMon = perKgToPerMon(Number(offer.pricePerKg));
            const rate = rates[offer.cropLot.crop.name] ?? pricePerMon;
            const delta = Math.round((pricePerMon / rate - 1) * 100);
            const cropName =
              language === "bn-BD"
                ? cropNamesBn[offer.cropLot.crop.name] ?? t(offer.cropLot.crop.name)
                : t(offer.cropLot.crop.name);

            return (
              <article className="offer-item" key={offer.id}>
                <div className="offer-item-head">
                  <span className="farmer-avatar small" aria-hidden="true">
                    {farmerInitials(offer.buyer.name)}
                  </span>
                  <div>
                    <strong>{t(offer.buyer.name)}</strong>
                    <span>
                      {cropName} · {t("Grade")} {v(offer.cropLot.grade)} ·{" "}
                      {v(Math.round(kgToMon(Number(offer.cropLot.quantityKg))))} {t("mon")}
                    </span>
                  </div>
                </div>
                <div className="offer-item-price">
                  <strong className="mono-figure">{v(taka(pricePerMon))}</strong>
                  <span>/ {t("mon")}</span>
                  <DeltaPill delta={delta} withSuffix />
                </div>
                <div className="offer-item-actions">
                  <button
                    className="secondary-button"
                    disabled={respondingId === offer.id}
                    type="button"
                    onClick={() => respond(offer, "decline")}
                  >
                    {t("Decline")}
                  </button>
                  <button
                    className="primary-button"
                    disabled={respondingId === offer.id}
                    type="button"
                    onClick={() => respond(offer, "accept")}
                  >
                    {t("Accept")}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      ) : null}

      <Link className="link-button offers-link" to="/prices">
        {t("See today's rates")}
      </Link>
    </section>
  );
}
