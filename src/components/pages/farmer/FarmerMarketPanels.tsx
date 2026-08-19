import { useCallback, useEffect, useMemo, useState } from "react";
import { Pencil, Sprout, X } from "lucide-react";
import { ApiRequestError } from "../../../api/auth";
import { fetchLotOffers, respondToLotOffer, type BackendLotOffer } from "../../../api/market";
import { useLanguage, useTranslate, useValueText } from "../../../i18n";
import { decorateLot } from "../../../market/deriveLots";
import { cropNamesBn, kgToMon, perKgToPerMon, taka } from "../../../market/marketData";
import type { MarketLotSource } from "../../../market/marketTypes";
import { useMarketStore } from "../../../store/useMarketStore";
import type { AuthUser } from "../../../types";
import { EmptyState, ListLoading } from "../../EmptyState";
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

/** My listings against today's district rate — the farmer's own version of the fair-price check. */
export function FarmerListingsVsMarket({
  lots,
  offerCounts,
  onEditLot,
  onPostCrop,
}: {
  lots: FarmerLotSummary[];
  /** Open offers per lot id. The status column reads "Live · 2 offers" when a lot has any. */
  offerCounts?: Record<string, number>;
  onEditLot?: (id: string) => void;
  onPostCrop?: () => void;
}) {
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
          hasFarmPhotos: false,
          id: lot.id,
          pricePerMon: perKgToPerMon(lot.pricePerKg),
          quantityMon: Math.max(1, Math.round(kgToMon(lot.quantityKg))),
          rating: 0,
          pickupWithin24h: false,
          transportIncluded: false,
        };
        return { ...decorateLot(source, { rates }), active: lot.active };
      }),
    [lots, rates],
  );

  return (
    <section className="desk-panel" id="farmer-market-check">
      <div className="desk-panel-head">
        <h2>{t("My listings")}</h2>
        <span>{t("Price vs. today's district rate")}</span>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={Sprout}
          title={t("No listings yet")}
          hint={t("Post your first crop and buyers in your district see it immediately.")}
          action={
            onPostCrop ? (
              <button className="primary-button" type="button" onClick={onPostCrop}>
                {t("Post a crop")}
              </button>
            ) : undefined
          }
        />
      ) : (
        <div className="listing-vs-market">
          <div className="listing-vs-market-head">
            <span>{t("Lot")}</span>
            <span>{t("Ask / mon")}</span>
            <span>{t("vs. market")}</span>
            <span>{t("Status")}</span>
            <span>{t("Edit")}</span>
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
                <DeltaPill delta={row.delta} withSuffix />
              </span>
              {/* Plain text, not a pill: the pill in this row belongs to the vs. market column. */}
              <span className="listing-vs-market-status">
                {row.active ? t("Live") : t("Paused")}
                {offerCounts?.[row.id]
                  ? ` · ${v(offerCounts[row.id])} ${t(offerCounts[row.id] === 1 ? "offer" : "offers")}`
                  : ""}
              </span>
              <span className="listing-vs-market-edit">
                <button className="listing-edit-button" type="button" onClick={() => onEditLot?.(row.id)}>
                  <Pencil aria-hidden="true" size={13} />
                  {t("Edit")}
                </button>
              </span>
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
    <section className="desk-panel desk-offers-panel" id="farmer-offers">
      <div className="desk-panel-head">
        <h2>{t("Offers waiting")}</h2>
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
                  <strong>{t(offer.buyer.name)}</strong>
                  <span>
                    {cropName} · {t("Grade")} {v(offer.cropLot.grade)} ·{" "}
                    {v(Math.round(kgToMon(Number(offer.cropLot.quantityKg))))} {t("mon")}
                  </span>
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
    </section>
  );
}
