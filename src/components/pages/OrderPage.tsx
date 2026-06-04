import { useEffect, useMemo, useState, type FormEvent } from "react";
import { BadgeCheck, CalendarClock, CheckCircle2, ClipboardList, MapPin, PackageCheck, Plus, ShieldCheck, ShoppingBag, Store, WalletCards } from "lucide-react";
import { ApiRequestError, createBuyerOrder, fetchMyOrders, type BackendOrder } from "../../api/auth";
import { getUpazillasForDistrict, lots, serviceDistricts } from "../../data";
import { useLanguage, useTranslate, useValueText } from "../../i18n";
import type { AuthUser, ChatThread, RegisteredAccount } from "../../types";
import { formatLocalizedDate, normalizeDateInput } from "../../utils/dateInput";
import { AccountProfilePanel } from "../account/AccountProfilePanel";
import { ChatWidget } from "../chat/ChatWidget";
import { FormGrid, SectionTitle } from "../shared";

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
  chatThreads,
  onProfileSaved,
  onSendChatMessage,
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
    <section className="page-wrap form-layout buyer-dashboard">
      <SectionTitle eyebrow="Buyer dashboard" title="Track crop requests, matched supply, delivery status, and admin support." t={t} />

      <section className="buyer-overview" aria-label={t("Buyer backend metrics")}>
        <article>
          <ClipboardList size={20} />
          <span>{t("Active order requests")}</span>
          <strong>{v(activeOrders.length)}</strong>
        </article>
        <article>
          <Store size={20} />
          <span>{t("Matched supply lots")}</span>
          <strong>{v(matchedLots.length)}</strong>
        </article>
        <article>
          <WalletCards size={20} />
          <span>{t("Total requested value")}</span>
          <strong>{v(formatCurrency(totalOrderValue))}</strong>
        </article>
      </section>

      <form className="panel form-panel" onSubmit={submitOrder}>
        <div className="backend-status-pill">
          <CheckCircle2 size={17} />
          {t("Backend connected")}
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
          <Plus size={18} />
          {t(isSubmitting ? "Submitting" : "Submit order request")}
        </button>
      </form>

      <aside className="panel side-panel buyer-access-panel">
        <ShieldCheck size={24} />
        <h3>{t("Buyer access")}</h3>
        <p>{t("Admins can review this dashboard. Buyers can use it only after approved login.")}</p>
        <div className="checklist">
          <span><CheckCircle2 size={18} /> {t("Protected by backend login")}</span>
          <span><BadgeCheck size={18} /> {t("Orders stay linked to the signed-in buyer")}</span>
          <span><CalendarClock size={18} /> {t("Admin can monitor fulfillment")}</span>
        </div>
      </aside>

      <section className="panel buyer-dashboard-panel">
        <div className="panel-header">
          <div>
            <span>{t("Backend orders")}</span>
            <h2>{t(user?.role === "admin" ? "All buyer order requests" : "Your order requests")}</h2>
          </div>
          <ShoppingBag size={22} />
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

      <section className="panel buyer-dashboard-panel matched-supply-panel">
        <div className="panel-header">
          <div>
            <span>{t("Matched supply")}</span>
            <h2>{t("Available lots for quick ordering")}</h2>
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

      <AccountProfilePanel user={user} onProfileSaved={onProfileSaved} />

      <ChatWidget
        chatThreads={chatThreads}
        subject="Order, delivery, and payment support"
        user={user}
        onSendMessage={onSendChatMessage}
      />
    </section>
  );
}
