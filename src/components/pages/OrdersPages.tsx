import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Check, Inbox, Phone, Play, ShieldCheck } from "lucide-react";
import { ApiRequestError, fetchMyOrders, type BackendOrder, type BackendPayment } from "../../api/auth";
import { advanceOrderStage } from "../../api/market";
import { useLanguage, useTranslate, useValueText } from "../../i18n";
import { cropNamesBn, escrowStages, kgToMon, taka } from "../../market/marketData";
import type { AuthUser } from "../../types";
import { EmptyState, ListLoading } from "../EmptyState";
import { EscrowPill } from "../market/MarketBits";

/** The five buyer-facing escrow stages, mapped from the order status the backend keeps. */
const STAGE_BY_STATUS: Record<string, number> = {
  COMPLETED: 5,
  IN_TRANSIT: 3,
  MATCHING: 1,
  PENDING: 1,
  PICKUP_BOOKED: 2,
  QUALITY_CHECK: 4,
};

const STAGE_LABEL_BY_NUMBER: Record<number, string> = {
  1: "Confirmed",
  2: "Pickup scheduled",
  3: "In transit",
  4: "Delivered",
  5: "Paid",
};

function heldPayment(order: BackendOrder): BackendPayment | undefined {
  return order.payments?.find((payment) => payment.status === "HELD");
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

function stageOf(order: BackendOrder) {
  return STAGE_BY_STATUS[order.status.toUpperCase()] ?? 1;
}

function escrowAmount(order: BackendOrder) {
  const payment = order.payments?.[0];
  return Number(payment?.amount ?? order.totalValue) || 0;
}

function orderLotLabel(order: BackendOrder, t: (text: string) => string, v: (text: string | number) => string) {
  return order.items
    .map((item) => `${t(item.crop.name)} · ${v(Math.round(kgToMon(Number(item.quantityKg))))} ${t("mon")}`)
    .join(", ");
}

/** Loads the orders the signed-in account may see. Staff see the whole book; buyers see their own. */
function useOrders(user: AuthUser | null) {
  const [orders, setOrders] = useState<BackendOrder[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const reload = useCallback(() => {
    if (!user?.accessToken) {
      setOrders([]);
      return;
    }

    setIsLoading(true);
    fetchMyOrders(user.accessToken)
      .then((result) => {
        setOrders(result);
        setError("");
      })
      .catch((requestError) => {
        setOrders([]);
        setError(requestError instanceof ApiRequestError ? requestError.message : "Could not load your orders.");
      })
      .finally(() => setIsLoading(false));
  }, [user?.accessToken]);

  useEffect(() => reload(), [reload]);

  return { error, isLoading, orders, reload, setOrders };
}

export function MyOrdersPage({ user }: { user: AuthUser | null }) {
  const navigate = useNavigate();
  const t = useTranslate();
  const v = useValueText();
  const { error, isLoading, orders } = useOrders(user);

  return (
    <section className="page-wrap orders-page">
      <div className="section-title">
        <span>{t("Escrow")}</span>
        <h1>{t("My orders")}</h1>
      </div>

      {isLoading ? <ListLoading label={t("Loading your orders...")} /> : null}
      {error ? <p className="marketplace-feedback warning">{t(error)}</p> : null}

      {!isLoading && orders.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title={t("No orders yet")}
          hint={t("Every order you place shows its escrow state here until the money is released.")}
          action={
            <Link className="primary-button" to="/marketplace">
              {t("Browse the marketplace")}
            </Link>
          }
        />
      ) : null}

      {orders.length > 0 ? (
        <div className="panel table-card">
          <div className="table-scroll">
            <div className="order-table">
              <div className="order-table-head" role="row">
                <span>{t("Order")}</span>
                <span>{t("Lot")}</span>
                <span>{t("Value")}</span>
                <span>{t("Escrow")}</span>
                <span>{t("Stage")}</span>
                <span>{t("Action")}</span>
              </div>
              {orders.map((order) => (
                <div className="order-table-row" key={order.id} role="row">
                  <span className="mono-figure">{v(order.id.slice(-8).toUpperCase())}</span>
                  <span>{orderLotLabel(order, t, v)}</span>
                  <span className="mono-figure">{v(taka(escrowAmount(order)))}</span>
                  <span>
                    <EscrowPill state={escrowState(order)} />
                  </span>
                  <span>{t(STAGE_LABEL_BY_NUMBER[stageOf(order)])}</span>
                  <span>
                    <button className="secondary-button" type="button" onClick={() => navigate(`/orders/${order.id}`)}>
                      {t("Track")}
                    </button>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

export function OrderTrackingPage({ user }: { user: AuthUser | null }) {
  const language = useLanguage();
  const t = useTranslate();
  const v = useValueText();
  const { orderId } = useParams();
  const { error, isLoading, orders, setOrders } = useOrders(user);
  const [advanceError, setAdvanceError] = useState("");
  const [isAdvancing, setIsAdvancing] = useState(false);

  const order = orders.find((item) => item.id === orderId);

  const steps = useMemo(() => {
    if (!order) {
      return [];
    }

    const placed = new Date(order.createdAt);
    const placedLabel = Number.isNaN(placed.getTime())
      ? ""
      : new Intl.DateTimeFormat("en-GB", { day: "2-digit", hour: "2-digit", minute: "2-digit", month: "short" }).format(
          placed,
        );
    const stage = stageOf(order);
    const subs = [
      `${t("Paid into escrow")} · ${v(placedLabel)}`,
      t("Truck assigned · tomorrow 06:30"),
      `${t(order.district.name)} → ${t("Dhaka")} · ${t("arriving 16:30")}`,
      t("Buyer confirms weight and quality"),
      t("Paid to the farmer's bKash"),
    ];

    return escrowStages.map((label, index) => ({
      current: index + 1 === stage,
      done: index + 1 < stage,
      label: t(label),
      notLast: index < escrowStages.length - 1,
      sub: subs[index],
      todo: index + 1 > stage,
    }));
  }, [order, t, v]);

  const advance = () => {
    if (!user?.accessToken || !order) {
      return;
    }

    setIsAdvancing(true);
    setAdvanceError("");
    advanceOrderStage(user.accessToken, order.id)
      .then((updated) => {
        setOrders((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      })
      .catch((requestError) => {
        setAdvanceError(
          requestError instanceof ApiRequestError ? requestError.message : "Could not move this order forward.",
        );
      })
      .finally(() => setIsAdvancing(false));
  };

  if (isLoading) {
    return (
      <section className="page-wrap">
        <ListLoading label={t("Loading your orders...")} />
      </section>
    );
  }

  if (!order) {
    return (
      <section className="page-wrap">
        <EmptyState
          icon={Inbox}
          title={t("Order not found")}
          hint={t(error || "It may belong to another account.")}
          action={
            <Link className="primary-button" to="/orders">
              {t("All orders")}
            </Link>
          }
        />
      </section>
    );
  }

  const stage = stageOf(order);
  const released = escrowState(order) === "released";
  const refunded = escrowState(order) === "refunded";
  const farmerName = order.items.find((item) => item.cropLot)?.cropLot?.farmer?.name ?? "";
  const cropLabel = order.items
    .map((item) => (language === "bn" ? cropNamesBn[item.crop.name] ?? t(item.crop.name) : t(item.crop.name)))
    .join(", ");
  const advanceLabel = stage === 3 ? "Confirm delivery" : stage === 4 ? "Release payment" : "Advance to next stage";

  return (
    <section className="page-wrap order-detail-page">
      <Link className="back-link" to="/orders">
        <ArrowLeft aria-hidden="true" size={16} />
        {t("All orders")}
      </Link>

      <div className="order-detail-head">
        <div>
          <h1>
            {t("Order")} <span className="mono-figure">{v(order.id.slice(-8).toUpperCase())}</span>
          </h1>
          <span>
            {cropLabel} · {orderLotLabel(order, t, v)}
            {farmerName ? ` · ${t(farmerName)}` : ""}
          </span>
        </div>
        <strong className="mono-figure order-detail-total">{v(taka(escrowAmount(order)))}</strong>
      </div>

      <div className="order-detail-layout">
        <div className="panel">
          <span className="filter-eyebrow">{t("Progress")}</span>
          <ol className="escrow-timeline">
            {steps.map((step) => (
              <li className={step.done ? "done" : step.current ? "current" : "todo"} key={step.label}>
                <span className="timeline-node" aria-hidden="true">
                  {step.done ? <Check size={13} /> : null}
                </span>
                {step.notLast ? <span className="timeline-line" aria-hidden="true" /> : null}
                <div>
                  <strong>{step.label}</strong>
                  <span>{step.sub}</span>
                </div>
              </li>
            ))}
          </ol>
          {order.disputeOpenedAt ? (
            <p className="soft-notice warn">
              {t("Staff opened a dispute on this order. The timeline is paused while it is reviewed.")}
            </p>
          ) : null}
          {advanceError ? <p className="soft-notice warn">{t(advanceError)}</p> : null}
          {!released && !refunded && !order.disputeOpenedAt ? (
            <button className="secondary-button advance-button" disabled={isAdvancing} type="button" onClick={advance}>
              <Play aria-hidden="true" size={15} />
              {t(isAdvancing ? "Working" : advanceLabel)}
            </button>
          ) : null}
        </div>

        <aside className="order-detail-rail">
          <div className="panel escrow-card">
            <div className="escrow-explainer-head">
              <ShieldCheck aria-hidden="true" size={17} />
              <strong>{t(refunded ? "Payment refunded" : released ? "Payment released" : "Payment held in escrow")}</strong>
            </div>
            <div className="escrow-card-body">
              <div>
                <span>{t("Amount")}</span>
                <strong className="mono-figure">{v(taka(escrowAmount(order)))}</strong>
              </div>
              <p>
                {released
                  ? `${t("Released to")} ${t(farmerName)} ${t("after you confirmed the delivery.")}`
                  : refunded
                    ? t("Refunded to your account.")
                    : `${t("Held by AmarKrishok. Released to")} ${t(farmerName)} ${t("once you confirm the delivery matches the lot.")}`}
              </p>
              {heldPayment(order)?.method ? (
                <p>
                  {t("Paid with")} {t(heldPayment(order)?.method ?? "")}
                </p>
              ) : null}
            </div>
          </div>

          <div className="panel driver-row">
            <span className="farmer-avatar" aria-hidden="true">
              JA
            </span>
            <div>
              <strong>{t("Jasim Ali · Truck")}</strong>
              <span className="mono-figure">DHAKA METRO-TA 11-4592</span>
            </div>
            <span className="checkout-row-icon" aria-hidden="true">
              <Phone size={16} />
            </span>
          </div>
        </aside>
      </div>
    </section>
  );
}

export function OrderPlacedPage({ user }: { user: AuthUser | null }) {
  const t = useTranslate();
  const v = useValueText();
  const { orderId } = useParams();
  const { orders } = useOrders(user);
  const order = orders.find((item) => item.id === orderId);

  return (
    <section className="page-wrap order-placed-page">
      <span className="order-placed-check" aria-hidden="true">
        <Check size={28} />
      </span>
      <h1>
        {t("Order")} <span className="mono-figure">{v(orderId?.slice(-8).toUpperCase() ?? "")}</span> {t("is placed")}
      </h1>
      <p>
        {order ? v(taka(escrowAmount(order))) : ""}{" "}
        {t("is held in escrow. The farmer has been notified and a truck is being assigned for pickup tomorrow morning.")}
      </p>
      <div className="order-placed-actions">
        <Link className="primary-button" to={orderId ? `/orders/${orderId}` : "/orders"}>
          {t("Track this order")}
        </Link>
        <Link className="secondary-button large" to="/marketplace">
          {t("Keep browsing")}
        </Link>
      </div>
    </section>
  );
}
