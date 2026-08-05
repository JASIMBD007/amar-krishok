import { useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, Inbox, MapPin, Truck } from "lucide-react";
import { ApiRequestError, createBuyerOrder } from "../../api/auth";
import { useLanguage, useTranslate, useValueText } from "../../i18n";
import {
  MIN_ORDER_MON,
  cropNamesBn,
  monToKg,
  orderCosts,
  paymentMethods,
  perMonToPerKg,
  taka,
} from "../../market/marketData";
import { useMarketLots } from "../../market/useMarket";
import type { AuthUser, CropLot } from "../../types";
import { EmptyState } from "../EmptyState";

/** Escrow checkout: the buyer pays AmarKrishok, never the farmer directly. */
export function CheckoutPage({ lots, user }: { lots: CropLot[]; user: AuthUser | null }) {
  const language = useLanguage();
  const navigate = useNavigate();
  const t = useTranslate();
  const v = useValueText();
  const { lotId } = useParams();
  const [searchParams] = useSearchParams();

  const marketLots = useMarketLots(lots);
  const lot = marketLots.find((item) => item.id === lotId);

  const [paymentMethod, setPaymentMethod] = useState<string>(paymentMethods[0].id);
  const [isPaying, setIsPaying] = useState(false);
  const [payError, setPayError] = useState("");

  const quantity = useMemo(() => {
    const requested = Number(searchParams.get("qty"));
    if (!lot) {
      return MIN_ORDER_MON;
    }

    if (!Number.isFinite(requested) || requested <= 0) {
      return Math.min(lot.quantityMon, MIN_ORDER_MON);
    }

    return Math.max(MIN_ORDER_MON, Math.min(requested, lot.quantityMon));
  }, [lot, searchParams]);

  if (!lot) {
    return (
      <section className="page-wrap">
        <EmptyState
          icon={Inbox}
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
  const costs = orderCosts(quantity, lot.pricePerMon);

  const pay = () => {
    if (!user?.accessToken) {
      navigate(`/login?next=${encodeURIComponent(`/checkout/${lot.id}?qty=${quantity}`)}`);
      return;
    }

    setIsPaying(true);
    setPayError("");
    // The backend recomputes the platform fee and holds the whole basket in escrow, so we only
    // send what it cannot derive: the lot, the quantity, transport and how the buyer is paying.
    createBuyerOrder(user.accessToken, {
      deliveryAddress: lot.upazilla ? `${lot.upazilla}, ${lot.district}` : lot.district,
      district: lot.district,
      items: [
        {
          crop: lot.crop,
          cropLotId: lot.id,
          offeredPricePerKg: perMonToPerKg(lot.pricePerMon),
          quantityKg: monToKg(quantity),
        },
      ],
      paymentMethod,
      transportFee: costs.transport,
      upazilla: lot.upazilla ?? lot.district,
    })
      .then((order) => navigate(`/orders/${order.id}/placed`))
      .catch((error) => {
        setPayError(error instanceof ApiRequestError ? error.message : "Could not place your order.");
      })
      .finally(() => setIsPaying(false));
  };

  return (
    <section className="page-wrap checkout-page">
      <Link className="back-link" to={`/lot/${lot.id}`}>
        <ArrowLeft aria-hidden="true" size={16} />
        {t("Back to the lot")}
      </Link>
      <h1>{t("Confirm your order")}</h1>

      <div className="checkout-layout">
        <div className="checkout-main">
          <div className="panel checkout-card">
            <span className="filter-eyebrow">{t("Delivery")}</span>
            <div className="checkout-row">
              <span className="checkout-row-icon" aria-hidden="true">
                <MapPin size={19} />
              </span>
              <div>
                <strong>{user ? t(user.name) : t("Your business")}</strong>
                <span>{t("Delivery address is taken from your buyer profile.")}</span>
              </div>
              <Link className="link-button" to="/buyer">
                {t("Change")}
              </Link>
            </div>
            <div className="checkout-row">
              <span className="checkout-row-icon" aria-hidden="true">
                <Truck size={19} />
              </span>
              <div>
                <strong>{t("AmarKrishok logistics partner")}</strong>
                <span>{t("Pickup tomorrow 06:30 · arrives about 16:30")}</span>
              </div>
              <strong className="mono-figure">{v(taka(costs.transport))}</strong>
            </div>
          </div>

          <div className="panel checkout-card">
            <span className="filter-eyebrow">{t("Pay into escrow with")}</span>
            <div className="pay-method-list" role="radiogroup" aria-label={t("Pay into escrow with")}>
              {paymentMethods.map((method) => {
                const selected = paymentMethod === method.id;
                return (
                  <button
                    aria-checked={selected}
                    className={selected ? "pay-method on" : "pay-method"}
                    key={method.id}
                    role="radio"
                    type="button"
                    onClick={() => setPaymentMethod(method.id)}
                  >
                    <span className="pay-radio" aria-hidden="true" />
                    <span>
                      <strong>{t(method.label)}</strong>
                      <em>{v(t(method.detail))}</em>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <aside className="checkout-summary panel">
          <div className="checkout-summary-head">
            <strong>
              {cropLabel} · {t("Grade")} {v(lot.grade)} · {v(quantity)} {t("mon")}
            </strong>
            <span>
              {t(lot.farmer)} · {t(lot.district)}
            </span>
          </div>
          <dl className="cost-breakdown">
            <div>
              <dt>
                {v(quantity)} {t("mon")} × {v(lot.priceLabel)}
              </dt>
              <dd className="mono-figure">{v(taka(costs.crop))}</dd>
            </div>
            <div>
              <dt>{t("Transport")}</dt>
              <dd className="mono-figure">{v(taka(costs.transport))}</dd>
            </div>
            <div>
              <dt>{t("Platform fee")}</dt>
              <dd className="mono-figure">{v(taka(costs.fee))}</dd>
            </div>
            <div className="cost-total">
              <dt>{t("Held in escrow")}</dt>
              <dd className="mono-figure">{v(taka(costs.total))}</dd>
            </div>
          </dl>
          {payError ? <p className="soft-notice warn">{t(payError)}</p> : null}
          <button className="primary-button full" disabled={isPaying} type="button" onClick={pay}>
            {isPaying ? t("Paying into escrow") : `${t("Pay")} ${v(taka(costs.total))} ${t("into escrow")}`}
          </button>
          <span className="order-box-hint">{t("Released to the farmer only after you confirm delivery.")}</span>
        </aside>
      </div>
    </section>
  );
}
