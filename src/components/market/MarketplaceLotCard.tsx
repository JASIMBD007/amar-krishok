import { NavLink } from "react-router-dom";
import { Leaf, PenLine, Star, Truck } from "lucide-react";
import { useLanguage, useTranslate, useValueText } from "../../i18n";
import { cropNamesBn } from "../../market/marketData";
import type { MarketLot } from "../../market/marketTypes";
import { DeltaPill, VerificationBadge } from "./MarketBits";

/** The canonical marketplace card, shared by the marketplace and homepage supply preview. */
export function MarketplaceLotCard({ lot, onEdit }: { lot: MarketLot; onEdit?: () => void }) {
  const language = useLanguage();
  const t = useTranslate();
  const v = useValueText();
  const cropLabel = language === "bn-BD" ? cropNamesBn[lot.crop] ?? t(lot.crop) : t(lot.crop);

  return (
    <article className="lot-card">
      <div className="lot-card-photo">
        {lot.image ? (
          <img alt={`${cropLabel} ${t("harvest")}`} src={lot.image} loading="lazy" />
        ) : (
          <Leaf aria-hidden="true" size={30} />
        )}
      </div>
      <div className="lot-card-body">
        <div>
          <div className="lot-card-heading">
            <h2>
              {cropLabel} · {t("Grade")} {v(lot.grade)}
            </h2>
            <VerificationBadge verified={lot.verified} />
          </div>
          <p>
            {t(lot.farmer)} · {t(lot.district)} · {v(lot.quantityMon)} {t("mon")}
          </p>
        </div>
        <div className="lot-card-price">
          <strong className="mono-figure">{v(lot.priceLabel)}</strong>
          <span>/ {t("mon")}</span>
          <DeltaPill delta={lot.delta} />
        </div>
        <div className="lot-card-meta">
          <span>
            <Star aria-hidden="true" size={13} /> {lot.completedOrders ? v(lot.ratingLabel) : t("New seller")}
          </span>
          <span>
            <Truck aria-hidden="true" size={13} /> {t(lot.logisticsLabel)}
          </span>
          <span className="lot-card-vs">{t("vs. market")}</span>
        </div>
        <div className="lot-card-actions">
          <NavLink className="primary-button full" to={`/lot/${lot.id}`}>
            {t("View lot")}
          </NavLink>
          {onEdit ? (
            <button className="edit-lot-button" type="button" onClick={onEdit}>
              <PenLine aria-hidden="true" size={16} />
              {t("Edit")}
            </button>
          ) : null}
        </div>
      </div>
    </article>
  );
}
