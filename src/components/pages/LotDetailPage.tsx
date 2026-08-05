import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ImageIcon, Minus, Plus, ShieldCheck, Star, X } from "lucide-react";
import { ApiRequestError } from "../../api/auth";
import { createLotOffer, fetchLotOffers, type BackendLotOffer } from "../../api/market";
import { useLanguage, useTranslate, useValueText } from "../../i18n";
import {
  cropNamesBn,
  MIN_ORDER_MON,
  QTY_STEP_MON,
  monToKg,
  orderCosts,
  perKgToPerMon,
  perMonToPerKg,
  taka,
} from "../../market/marketData";
import { useMarketLots } from "../../market/useMarket";
import type { AuthUser, CropLot } from "../../types";
import { EmptyState } from "../EmptyState";
import { DeltaPill, RateHistoryBars, VerificationBadge } from "../market/MarketBits";

const ESCROW_STEPS = [
  "You pay AmarKrishok, not the farmer.",
  "The lot is weighed at pickup — short weight adjusts the amount automatically.",
  "You have 6 hours after delivery to raise a quality claim.",
  "Only then is the farmer paid.",
];

/**
 * The evidence page. A buyer either commits here or counters, so the asking price is always shown
 * against the district rate, the recent rate history and what comparable lots closed at.
 */
export function LotDetailPage({ lots, user }: { lots: CropLot[]; user: AuthUser | null }) {
  const language = useLanguage();
  const navigate = useNavigate();
  const t = useTranslate();
  const v = useValueText();
  const { lotId } = useParams();

  const marketLots = useMarketLots(lots);
  const lot = marketLots.find((item) => item.id === lotId);

  const [quantity, setQuantity] = useState(MIN_ORDER_MON);
  const [offerOpen, setOfferOpen] = useState(false);
  const [offerPrice, setOfferPrice] = useState(0);
  const [offers, setOffers] = useState<BackendLotOffer[]>([]);
  const [offerError, setOfferError] = useState("");
  const [isSendingOffer, setIsSendingOffer] = useState(false);

  useEffect(() => {
    if (!lot) {
      return;
    }

    setQuantity(Math.max(MIN_ORDER_MON, Math.min(lot.quantityMon, QTY_STEP_MON * 12)));
    setOfferPrice(Math.round(lot.pricePerMon * 0.96));
    setOfferOpen(false);
  }, [lot?.id, lot?.pricePerMon, lot?.quantityMon]);

  // A buyer's own offer on this lot, so the page can report whether the farmer has answered.
  useEffect(() => {
    if (!user?.accessToken) {
      setOffers([]);
      return;
    }

    let active = true;
    fetchLotOffers(user.accessToken)
      .then((result) => {
        if (active) {
          setOffers(result);
        }
      })
      .catch(() => {
        if (active) {
          setOffers([]);
        }
      });

    return () => {
      active = false;
    };
  }, [user?.accessToken]);

  const sentOffer = useMemo(() => offers.find((offer) => offer.cropLot.id === lotId), [lotId, offers]);

  if (!lot) {
    return (
      <section className="page-wrap">
        <EmptyState
          icon={ImageIcon}
          title={t("This lot is no longer listed")}
          hint={t("It may have been sold or suspended. Browse the marketplace for the current supply.")}
          action={
            <Link className="primary-button" to="/marketplace">
              {t("Back to marketplace")}
            </Link>
          }
        />
      </section>
    );
  }

  const cropLabel = language === "bn" ? cropNamesBn[lot.crop] ?? t(lot.crop) : t(lot.crop);
  const clampedQuantity = Math.max(MIN_ORDER_MON, Math.min(quantity, Math.max(MIN_ORDER_MON, lot.quantityMon)));
  const costs = orderCosts(clampedQuantity, lot.pricePerMon);
  const closedNear = Math.round(lot.rate * 1.004);
  const cheapestSameGrade = Math.min(
    ...marketLots.filter((item) => item.crop === lot.crop && item.grade === lot.grade && item.visible).map((item) => item.pricePerMon),
  );

  const startCheckout = () => {
    if (!user) {
      navigate(`/login?next=${encodeURIComponent(`/checkout/${lot.id}?qty=${clampedQuantity}`)}`);
      return;
    }

    navigate(`/checkout/${lot.id}?qty=${clampedQuantity}`);
  };

  const submitOffer = () => {
    if (!user?.accessToken) {
      navigate(`/login?next=${encodeURIComponent(`/lot/${lot.id}`)}`);
      return;
    }

    setIsSendingOffer(true);
    setOfferError("");
    // Offers are quoted per mon in the UI but stored per kg, matching the lot's asking price.
    createLotOffer(user.accessToken, { cropLotId: lot.id, pricePerKg: perMonToPerKg(offerPrice) })
      .then((offer) => {
        setOffers((current) => [offer, ...current.filter((item) => item.cropLot.id !== lot.id)]);
        setOfferOpen(false);
      })
      .catch((error) => {
        setOfferError(error instanceof ApiRequestError ? error.message : "Could not send your offer.");
      })
      .finally(() => setIsSendingOffer(false));
  };

  return (
    <section className="page-wrap lot-page">
      <Link className="back-link" to="/marketplace">
        <ArrowLeft aria-hidden="true" size={16} />
        {t("Back to marketplace")}
      </Link>

      <div className="lot-detail-layout">
        <div className="lot-detail-main">
          <div className="lot-photo-area">
            {lot.image ? <img alt={`${cropLabel} ${t("harvest")}`} src={lot.image} /> : <ImageIcon aria-hidden="true" size={28} />}
          </div>

          <div className="panel lot-spec-card">
            <div className="lot-spec-head">
              <div>
                <h1>
                  {cropLabel} · {t("Grade")} {v(lot.grade)} · {v(lot.quantityMon)} {t("mon")}
                </h1>
                <span>
                  {lot.upazilla ? `${t(lot.upazilla)}, ` : ""}
                  {t(lot.district)} · {t("Listing")} {v(lot.id)}
                </span>
              </div>
              <VerificationBadge verified={lot.verified} />
            </div>
            <div className="lot-spec-strip">
              <div>
                <span>{t("Grade")}</span>
                <strong>{v(lot.grade)}</strong>
              </div>
              <div>
                <span>{t("Available")}</span>
                <strong>
                  {v(lot.quantityMon)} {t("mon")}
                </strong>
              </div>
              <div>
                <span>{t("Packing")}</span>
                <strong>{t("50 kg jute sack")}</strong>
              </div>
              <div>
                <span>{t("Pickup")}</span>
                <strong>{t(lot.transportIncluded ? "Transport incl." : "Within 24 h")}</strong>
              </div>
            </div>
            <p>
              {t("Hand-sorted and re-bagged at the farm. Loading is possible from the farm gate, and the lot is weighed again at the district hub before dispatch.")}
            </p>
          </div>

          <div className="panel fair-price-card">
            <div className="panel-header">
              <h2>{t("Is this a fair price?")}</h2>
              <DeltaPill delta={lot.delta} withSuffix />
            </div>
            <div className="fair-price-body">
              <div className="fair-price-chart">
                <RateHistoryBars
                  crop={lot.crop}
                  label={`${t(lot.district)} ${t("wholesale rate, last 30 days")}`}
                />
                <span>
                  {t(lot.district)} {t("wholesale rate, last 30 days")} · ৳ / {t("mon")}
                </span>
              </div>
              <dl className="fair-price-rows">
                <div>
                  <dt>{t("This lot")}</dt>
                  <dd className="mono-figure">{v(lot.priceLabel)}</dd>
                </div>
                <div>
                  <dt>{t("District average")}</dt>
                  <dd className="mono-figure">{v(lot.rateLabel)}</dd>
                </div>
                <div>
                  <dt>{t("Deals closed here")}</dt>
                  <dd className="mono-figure">{v(taka(closedNear))}</dd>
                </div>
                <div>
                  <dt>{t("Cheapest same grade")}</dt>
                  <dd className="mono-figure">{v(taka(Number.isFinite(cheapestSameGrade) ? cheapestSameGrade : lot.pricePerMon))}</dd>
                </div>
              </dl>
            </div>
          </div>

          <div className="panel farmer-card">
            <span className="farmer-avatar" aria-hidden="true">
              {lot.initials}
            </span>
            <div>
              <strong>{t(lot.farmer)}</strong>
              <span>
                {t("Farming since")} {v(lot.farmingSince)} · {t(lot.district)} ·{" "}
                {t(lot.verified ? "NID and land papers verified" : "verification in progress")}
              </span>
            </div>
            <div className="farmer-card-stats">
              <div>
                <strong className="mono-figure">{v(lot.completedOrders)}</strong>
                <span>{t("orders")}</span>
              </div>
              <div>
                <strong className="mono-figure">
                  {lot.completedOrders ? v(lot.rating.toFixed(1)) : "—"} <Star aria-hidden="true" size={12} />
                </strong>
                <span>{t("rating")}</span>
              </div>
            </div>
          </div>
        </div>

        <aside className="lot-detail-rail">
          <div className="panel order-box">
            <div className="order-box-price">
              <strong className="mono-figure">{v(lot.priceLabel)}</strong>
              <span>/ {t("mon")}</span>
            </div>

            <div className="order-box-quantity">
              <span className="filter-eyebrow">{t("Quantity")}</span>
              <div className="qty-stepper">
                <button
                  aria-label={t("Reduce quantity")}
                  type="button"
                  onClick={() => setQuantity((current) => Math.max(MIN_ORDER_MON, current - QTY_STEP_MON))}
                >
                  <Minus aria-hidden="true" size={17} />
                </button>
                <div className="mono-figure" aria-live="polite">
                  {v(clampedQuantity)} {t("mon")}
                </div>
                <button
                  aria-label={t("Increase quantity")}
                  type="button"
                  onClick={() => setQuantity((current) => Math.min(lot.quantityMon, current + QTY_STEP_MON))}
                >
                  <Plus aria-hidden="true" size={17} />
                </button>
              </div>
              <span className="order-box-hint">
                {v(monToKg(clampedQuantity).toLocaleString("en-IN"))} {t("kg")} · {t("minimum")} {v(MIN_ORDER_MON)}{" "}
                {t("mon")}
              </span>
            </div>

            <dl className="cost-breakdown">
              <div>
                <dt>{t("Crop")}</dt>
                <dd className="mono-figure">{v(taka(costs.crop))}</dd>
              </div>
              <div>
                <dt>{t("Transport")}</dt>
                <dd className="mono-figure">{v(taka(costs.transport))}</dd>
              </div>
              <div>
                <dt>{t("Platform fee · 1 %")}</dt>
                <dd className="mono-figure">{v(taka(costs.fee))}</dd>
              </div>
              <div className="cost-total">
                <dt>{t("Total")}</dt>
                <dd className="mono-figure">{v(taka(costs.total))}</dd>
              </div>
            </dl>

            <div className="order-box-actions">
              <button className="primary-button full" type="button" onClick={startCheckout}>
                {t("Order now")}
              </button>
              <button className="secondary-button full" type="button" onClick={() => setOfferOpen(true)}>
                {t("Make an offer")}
              </button>
            </div>

            {sentOffer && sentOffer.status === "OPEN" ? (
              <p className="soft-notice">
                {t("Offer of")} {v(taka(perKgToPerMon(Number(sentOffer.pricePerKg))))} / {t("mon")}{" "}
                {t("sent. The farmer has 24 hours to reply — no money moves yet.")}
              </p>
            ) : null}
            {sentOffer && sentOffer.status === "ACCEPTED" ? (
              <p className="soft-notice">{t("The farmer accepted your offer. Order now to move the money into escrow.")}</p>
            ) : null}
            {sentOffer && sentOffer.status === "DECLINED" ? (
              <p className="soft-notice warn">{t("The farmer declined your offer. You can still order at the asking price.")}</p>
            ) : null}
            {offerError ? <p className="soft-notice warn">{t(offerError)}</p> : null}

            <span className="order-box-hint">{t("Nothing is charged until the farmer accepts.")}</span>
          </div>

          {offerOpen ? (
            <div className="panel offer-panel">
              <div className="panel-header">
                <h2>{t("Your offer")}</h2>
                <button className="icon-button" aria-label={t("Close")} type="button" onClick={() => setOfferOpen(false)}>
                  <X size={17} />
                </button>
              </div>
              <label className="offer-input">
                <span aria-hidden="true">৳</span>
                <input
                  aria-label={t("Your offer")}
                  min={1}
                  onChange={(event) => setOfferPrice(Number(event.target.value))}
                  type="number"
                  value={offerPrice}
                />
                <span>/ {t("mon")}</span>
              </label>
              <p>
                {t("Most")} {cropLabel} {t("deals in")} {t(lot.district)} {t("closed near")}{" "}
                <strong className="mono-figure">{v(taka(closedNear))}</strong>. {t("Offers more than 6 % below are usually declined.")}
              </p>
              <button className="primary-button full" disabled={isSendingOffer} type="button" onClick={submitOffer}>
                {t(isSendingOffer ? "Sending offer" : "Send offer")}
              </button>
            </div>
          ) : null}

          <div className="panel escrow-explainer">
            <div className="escrow-explainer-head">
              <ShieldCheck aria-hidden="true" size={18} />
              <strong>{t("How your money is protected")}</strong>
            </div>
            <ol>
              {ESCROW_STEPS.map((step, index) => (
                <li key={step}>
                  <span className="escrow-step-number mono-figure">{v(index + 1)}</span>
                  {t(step)}
                </li>
              ))}
            </ol>
          </div>
        </aside>
      </div>
    </section>
  );
}
