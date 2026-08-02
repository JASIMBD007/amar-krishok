import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  BadgeCheck,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  ClipboardPlus,
  LayoutDashboard,
  ListChecks,
  MapPin,
  PackageCheck,
  SendHorizontal,
  ShieldCheck,
  ShoppingBag,
  Store,
  Truck,
  UserRoundCheck,
  WalletCards,
} from "lucide-react";
import { ApiRequestError, createBuyerOrder, fetchMyOrders, type BackendOrder } from "../../api/auth";
import { getUpazillasForDistrict, lots, serviceDistricts } from "../../data";
import { useLanguage, useTranslate, useValueText } from "../../i18n";
import type { AuthUser, ChatThread, RegisteredAccount } from "../../types";
import { formatLocalizedDate, normalizeDateInput } from "../../utils/dateInput";
import { AccountProfilePanel } from "../account/AccountProfilePanel";
import { KpiCard, sparklineFromRecords } from "../KpiCard";
import { FormGrid } from "../shared";

type BuyerOrderForm = {
  crop: string;
  deliveryAddress: string;
  district: string;
  upazilla: string;
  notes: string;
  offeredPricePerKg: string;
  quantityKg: string;
  targetDate: string;
};

const emptyOrderForm: BuyerOrderForm = {
  crop: "",
  deliveryAddress: "",
  district: "",
  upazilla: "",
  notes: "",
  offeredPricePerKg: "",
  quantityKg: "",
  targetDate: "",
};

const buyerNavItems = [
  { id: "buyer-dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { id: "buyer-order-form", icon: ShoppingBag, label: "Order" },
  { id: "buyer-orders", icon: ClipboardList, label: "Orders" },
  { id: "buyer-matches", icon: Store, label: "Matched supply" },
  { id: "buyer-payments", icon: WalletCards, label: "Payments" },
  { id: "buyer-profile", icon: UserRoundCheck, label: "Profile" },
];

function numericValue(value: string | number) {
  return Number(value);
}

function formatQuantityKg(value: string | number) {
  const kg = numericValue(value);
  if (!Number.isFinite(kg)) {
    return "0 kg";
  }

  if (kg >= 1000) {
    return `${(kg / 1000).toFixed(kg % 1000 === 0 ? 0 : 1)} tons`;
  }

  return `${kg.toLocaleString("en-US")} kg`;
}

function formatCurrency(value: string | number) {
  const amount = numericValue(value);
  if (!Number.isFinite(amount)) {
    return "৳0";
  }

  return `৳${Math.round(amount).toLocaleString("en-US")}`;
}

function formatStatus(status: string) {
  const label = status.toLowerCase().replaceAll("_", " ");
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function statusClassName(status: string) {
  return status.toLowerCase().replaceAll("_", "-");
}

function orderQuantity(order: BackendOrder) {
  return order.items.reduce((total, item) => total + numericValue(item.quantityKg), 0);
}

function orderCropLabel(order: BackendOrder) {
  return order.items.map((item) => item.crop.name).join(", ") || "Crop request";
}

export function OrderPage({
  onProfileSaved,
  user,
}: {
  chatThreads: ChatThread[];
  onProfileSaved: (account: RegisteredAccount) => void;
  onSendChatMessage: (user: AuthUser, text: string, subject: string) => void;
  user: AuthUser | null;
}) {
  const language = useLanguage();
  const t = useTranslate();
  const v = useValueText();
  const [backendOrders, setBackendOrders] = useState<BackendOrder[]>([]);
  const [form, setForm] = useState<BuyerOrderForm>(emptyOrderForm);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const availableUpazillas = getUpazillasForDistrict(form.district);
  const matchedLots = lots.slice(0, 3);
  const activeOrders = useMemo(
    () => backendOrders.filter((order) => !["COMPLETED", "CANCELLED"].includes(order.status)),
    [backendOrders],
  );
  const totalOrderValue = useMemo(
    () => backendOrders.reduce((total, order) => total + numericValue(order.totalValue), 0),
    [backendOrders],
  );
  const activeOrderValue = useMemo(
    () => activeOrders.reduce((total, order) => total + numericValue(order.totalValue), 0),
    [activeOrders],
  );
  const latestOrder = activeOrders[0] ?? backendOrders[0];
  // Honest 7-day sparklines built from the buyer's own order activity.
  const ordersPlacedSpark = useMemo(() => sparklineFromRecords(backendOrders.map((order) => ({ date: order.createdAt, value: 1 }))), [backendOrders]);
  const orderValueSpark = useMemo(
    () => sparklineFromRecords(backendOrders.map((order) => ({ date: order.createdAt, value: numericValue(order.totalValue) }))),
    [backendOrders],
  );

  useEffect(() => {
    if (!user?.accessToken) {
      return;
    }

    setIsLoading(true);
    fetchMyOrders(user.accessToken)
      .then((orders) => {
        setBackendOrders(orders);
        setError("");
      })
      .catch((apiError) => {
        setError(apiError instanceof ApiRequestError ? apiError.message : "Could not load buyer orders.");
      })
      .finally(() => setIsLoading(false));
  }, [user?.accessToken]);

  const updateField = (field: keyof BuyerOrderForm, value: string) => {
    setForm((current) => ({ ...current, [field]: value, ...(field === "district" ? { upazilla: "" } : {}) }));
  };

  const scrollToSection = (sectionId: string) => {
    document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const submitOrder = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSuccess("");

    if (!user?.accessToken) {
      setError("Please sign in again to submit an order.");
      return;
    }

    if (user.role !== "buyer") {
      setError("Admins can review buyer dashboards, but buyer orders must be created from a buyer account.");
      return;
    }

    const quantityKg = Number(form.quantityKg);
    const offeredPricePerKg = Number(form.offeredPricePerKg);
    if (!form.crop.trim() || !form.district.trim() || !form.upazilla.trim() || !form.deliveryAddress.trim() || !quantityKg || !offeredPricePerKg) {
      setError("Please fill in crop, district, upazilla, delivery address, quantity, and offer price.");
      return;
    }

    if (quantityKg <= 0 || offeredPricePerKg <= 0) {
      setError("Quantity and offer price must be greater than zero.");
      return;
    }

    setIsSubmitting(true);
    setError("");

    createBuyerOrder(user.accessToken, {
      deliveryAddress: form.deliveryAddress.trim(),
      district: form.district.trim(),
      upazilla: form.upazilla.trim(),
      items: [
        {
          crop: form.crop.trim(),
          offeredPricePerKg,
          quantityKg,
        },
      ],
      notes: form.notes.trim() || undefined,
      targetDate: normalizeDateInput(form.targetDate) || undefined,
    })
      .then((order) => {
        setBackendOrders((current) => [order, ...current]);
        setForm(emptyOrderForm);
        setSuccess("Order request sent to backend.");
      })
      .catch((apiError) => {
        setError(apiError instanceof ApiRequestError ? apiError.message : "Could not submit order request.");
      })
      .finally(() => setIsSubmitting(false));
  };

  return (
    <section className="dashboard-shell restored-dashboard buyer-dashboard-shell" id="buyer-dashboard">
      <aside className="sidebar buyer-sidebar">
        <div className="admin-brand">
          <ShoppingBag size={25} />
          <div>
            <strong>{t("Buyer Control")}</strong>
            <small>{t("Demand command")}</small>
          </div>
        </div>
        <nav className="side-nav buyer-side-nav" aria-label={t("Buyer dashboard navigation")}>
          {buyerNavItems.map((item) => {
            const Icon = item.icon;
            return (
              <button className={item.id === "buyer-dashboard" ? "active" : ""} key={item.id} onClick={() => scrollToSection(item.id)} type="button">
                <Icon size={19} />
                <span className="side-nav-label">{t(item.label)}</span>
              </button>
            );
          })}
        </nav>
        <div className="trust-summary buyer-trust-summary">
          <ShieldCheck size={22} />
          <strong>{t("Payment protected")}</strong>
          <span>{t("Buyer payment stays protected until delivery and quality checks are confirmed.")}</span>
        </div>
      </aside>

      <div className="workspace dashboard-workspace buyer-dashboard-workspace">
        <header className="dashboard-topbar buyer-dashboard-topbar">
          <div className="page-title">
            <span>{t("Buyer workspace")}</span>
            <h1>{t("Procurement dashboard")}</h1>
          </div>
          <div className="topbar-actions buyer-topbar-actions">
            <button className="secondary-button" onClick={() => scrollToSection("buyer-orders")} type="button">
              <ListChecks size={18} />
              {t("My orders")}
            </button>
            <button className="primary-button" onClick={() => scrollToSection("buyer-order-form")} type="button">
              <ClipboardPlus size={18} />
              {t("New order")}
            </button>
          </div>
        </header>

        <section className="stats-grid buyer-stats-grid kpi-grid" aria-label={t("Buyer order metrics")}>
          <KpiCard
            icon={ClipboardList}
            label={t("Active order requests")}
            value={v(activeOrders.length)}
            detail={t("Being reviewed by the team")}
            spark={ordersPlacedSpark}
          />
          <KpiCard
            icon={Store}
            label={t("Matched supply lots")}
            value={v(matchedLots.length)}
            detail={t("Ready for quick ordering")}
          />
          <KpiCard
            icon={WalletCards}
            label={t("Protected order value")}
            value={v(formatCurrency(activeOrderValue))}
            detail={t("Held until confirmation")}
            spark={orderValueSpark}
          />
          <KpiCard
            icon={Truck}
            label={t("Next delivery")}
            value={latestOrder ? formatLocalizedDate(latestOrder.targetDate, language, t("Pending")) : t("None")}
            detail={latestOrder ? t(formatStatus(latestOrder.status)) : t("Create an order to start")}
          />
        </section>

        <section className="dashboard-grid buyer-dashboard-grid">
          <div className="buyer-main-column">
            <form className="panel form-panel buyer-form-panel" id="buyer-order-form" onSubmit={submitOrder}>
              <div className="panel-header buyer-form-heading">
                <div>
                  <span>{t("Order request")}</span>
                  <h2>{t("Request crop supply")}</h2>
                  <p>{t("Tell us what crop you need, where to deliver, and the price you can offer.")}</p>
                </div>
                <ShoppingBag size={22} />
              </div>
              <div className="buyer-profile-strip">
                <ShoppingBag size={18} />
                <div>
                  <span>{t(user?.role === "admin" ? "Admin oversight mode" : "Buyer account mode")}</span>
                  <strong>{user?.name ?? t("Signed-in buyer")}</strong>
                </div>
              </div>
              <FormGrid>
                <label className="input-field">
                  <span>{t("Crop needed")}</span>
                  <input value={form.crop} onChange={(event) => updateField("crop", event.target.value)} placeholder={t("Tomato")} />
                </label>
                <label className="input-field">
                  <span>{t("District")}</span>
                  <select value={form.district} onChange={(event) => updateField("district", event.target.value)}>
                    <option value="" disabled>
                      {t("Select service district")}
                    </option>
                    {serviceDistricts.map((district) => (
                      <option key={district} value={district}>
                        {t(district)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="input-field">
                  <span>{t("Upazilla")}</span>
                  <select value={form.upazilla} onChange={(event) => updateField("upazilla", event.target.value)} disabled={!form.district}>
                    <option value="" disabled>
                      {t(form.district ? "Select upazilla" : "Select district first")}
                    </option>
                    {availableUpazillas.map((upazilla) => (
                      <option key={upazilla} value={upazilla}>
                        {t(upazilla)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="input-field">
                  <span>{t("Quantity (kg)")}</span>
                  <input value={form.quantityKg} min="1" onChange={(event) => updateField("quantityKg", event.target.value)} placeholder="2000" type="number" />
                </label>
                <label className="input-field">
                  <span>{t("Offer price per kg")}</span>
                  <input value={form.offeredPricePerKg} min="1" onChange={(event) => updateField("offeredPricePerKg", event.target.value)} placeholder="42" type="number" />
                </label>
                <label className="input-field">
                  <span>{t("Target date")}</span>
                  <input value={form.targetDate} onChange={(event) => updateField("targetDate", event.target.value)} type="date" />
                </label>
                <label className="input-field">
                  <span>{t("Delivery area")}</span>
                  <input value={form.deliveryAddress} onChange={(event) => updateField("deliveryAddress", event.target.value)} placeholder={t("Dhaka North")} />
                </label>
              </FormGrid>
              <label className="full-field">
                <span>{t("Quality requirement")}</span>
                <textarea value={form.notes} onChange={(event) => updateField("notes", event.target.value)} placeholder={t("Grade, packaging, ripeness, delivery notes...")} />
              </label>
              {error && <p className="auth-error">{t(error)}</p>}
              {success && <p className="auth-notice">{t(success)}</p>}
              <button className="primary-button full" type="submit" disabled={isSubmitting || user?.role === "admin"}>
                <SendHorizontal size={18} />
                {t(isSubmitting ? "Submitting" : "Submit order request")}
              </button>
            </form>

            <section className="panel buyer-dashboard-panel buyer-orders-panel" id="buyer-orders">
              <div className="panel-header">
                <div>
                  <span>{t("Order tracking")}</span>
                  <h2>{t(user?.role === "admin" ? "All buyer order requests" : "Your order requests")}</h2>
                  <p>{t("Orders are handled by the team, so buyer records stay read-only after submission.")}</p>
                </div>
                <ClipboardList size={22} />
              </div>
              <div className="buyer-dashboard-list">
                {isLoading && <em>{t("Loading buyer orders...")}</em>}
                {!isLoading && backendOrders.length === 0 && <em>{t("No backend orders yet.")}</em>}
                {backendOrders.map((order) => (
                  <article className="buyer-order-item" key={order.id}>
                    <div>
                      <strong>{t(orderCropLabel(order))}</strong>
                      <span>{order.id}</span>
                    </div>
                    <div>
                      <strong>{v(formatQuantityKg(orderQuantity(order)))}</strong>
                      <span>{t(order.upazilla || order.district.name)}</span>
                    </div>
                    <div>
                      <strong>{v(formatCurrency(order.totalValue))}</strong>
                      <span>{formatLocalizedDate(order.targetDate, language, t("Target date pending"))}</span>
                    </div>
                    <em className={`status ${statusClassName(order.status)}`}>{t(formatStatus(order.status))}</em>
                  </article>
                ))}
              </div>
            </section>

            <section className="panel buyer-dashboard-panel matched-supply-panel" id="buyer-matches">
              <div className="panel-header">
                <div>
                  <span>{t("Matched supply")}</span>
                  <h2>{t("Available lots for quick ordering")}</h2>
                  <p>{t("Use these verified lots as a guide when creating your next request.")}</p>
                </div>
                <Store size={22} />
              </div>
              <div className="buyer-supply-grid">
                {matchedLots.map((lot) => (
                  <article className="buyer-supply-item" key={lot.id}>
                    <img src={lot.image} alt={`${t(lot.crop)} ${t("harvest")}`} />
                    <div>
                      <strong>{t(lot.crop)}</strong>
                      <span><MapPin size={14} /> {t(lot.district)}</span>
                      <span><PackageCheck size={14} /> {t(lot.quantity)}</span>
                    </div>
                    <em>{v(lot.ask)}</em>
                  </article>
                ))}
              </div>
            </section>

            <div id="buyer-profile">
              <AccountProfilePanel user={user} onProfileSaved={onProfileSaved} />
            </div>
          </div>

          <aside className="buyer-right-rail">
            <section className="panel buyer-rail-panel">
              <div className="buyer-rail-header">
                <UserRoundCheck size={22} />
                <div>
                  <span>{t("Profile")}</span>
                  <h3>{t("Buyer readiness")}</h3>
                </div>
              </div>
              <p>{t("Keep your business details and delivery area updated so the team can match supply faster.")}</p>
              <div className="checklist compact">
                <span><CheckCircle2 size={18} /> {t("Phone verified")}</span>
                <span><BadgeCheck size={18} /> {t("Orders stay linked to the signed-in buyer")}</span>
                <span><CalendarClock size={18} /> {t("Admin can monitor fulfillment")}</span>
              </div>
              <button className="secondary-button full" onClick={() => scrollToSection("buyer-profile")} type="button">
                <UserRoundCheck size={18} />
                {t("Open profile")}
              </button>
            </section>

            <section className="panel buyer-rail-panel" id="buyer-payments">
              <div className="buyer-rail-header">
                <WalletCards size={22} />
                <div>
                  <span>{t("Payments")}</span>
                  <h3>{t("Payment protection")}</h3>
                </div>
              </div>
              <div className="release-amount buyer-payment-card">
                <span>{t("Protected value")}</span>
                <strong>{v(formatCurrency(activeOrderValue))}</strong>
              </div>
              <div className="buyer-mini-list">
                <span><ShieldCheck size={18} /> {t("Payment stays protected until delivery")}</span>
                <span><CheckCircle2 size={18} /> {t("Release happens after confirmation")}</span>
              </div>
            </section>

            <section className="panel buyer-rail-panel">
              <div className="buyer-rail-header">
                <Truck size={22} />
                <div>
                  <span>{t("Delivery")}</span>
                  <h3>{t("Latest order")}</h3>
                </div>
              </div>
              {latestOrder ? (
                <div className="buyer-latest-order">
                  <strong>{t(orderCropLabel(latestOrder))}</strong>
                  <span>{t(latestOrder.upazilla || latestOrder.district.name)} · {v(formatQuantityKg(orderQuantity(latestOrder)))}</span>
                  <em className={`status ${statusClassName(latestOrder.status)}`}>{t(formatStatus(latestOrder.status))}</em>
                </div>
              ) : (
                <p>{t("Create your first order request to start tracking delivery.")}</p>
              )}
              <button className="primary-button full" onClick={() => scrollToSection("buyer-order-form")} type="button">
                <ClipboardPlus size={18} />
                {t("New order")}
              </button>
            </section>
          </aside>
        </section>
      </div>
    </section>
  );
}
