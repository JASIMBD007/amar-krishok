import {
  BadgeCheck,
  Banknote,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ClipboardCheck,
  Clock3,
  HandCoins,
  LockKeyhole,
  MapPin,
  MessageSquareText,
  PackageCheck,
  Pencil,
  Route as RouteIcon,
  Settings,
  ShieldCheck,
  Sprout,
  Truck,
  UserRoundCheck,
  UsersRound,
  WalletCards,
} from "lucide-react";
import type { BackendOrder } from "../../../api/auth";
import { adminPriceSignals, adminRoutes, dashboardStats, lots, orders } from "../../../data";
import { useLanguage, useTranslate, useValueText } from "../../../i18n";
import type { AccountStatus, AdminSection, CropLot, RegisteredAccount, RegisteredCropLotRecord } from "../../../types";
import { formatLocalizedDate } from "../../../utils/dateInput";
import { matchesSearch } from "../../../utils/search";
import { statusClass, TrendIcon } from "../pageHelpers";
import { accountMatchesSearch } from "./searchHelpers";

type OpenAdminSection = (section: AdminSection) => void;
type OrderRow = {
  buyer: string;
  crop: string;
  destination: string;
  eta: string;
  id: string;
  quantity: string;
  status: string;
  value: string;
};

function numericValue(value: string | number) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

function formatMoney(value: string | number) {
  return `৳${Math.round(numericValue(value)).toLocaleString("en-US")}`;
}

function backendQuantity(order: BackendOrder) {
  return order.items.reduce((total, item) => total + numericValue(item.quantityKg), 0);
}

function formatOrderQuantity(value: number) {
  if (value >= 1000) {
    return `${(value / 1000).toFixed(value % 1000 === 0 ? 0 : 1)} tons`;
  }

  return `${value.toLocaleString("en-US")} kg`;
}

function formatBackendStatus(status: string) {
  const label = status.toLowerCase().replaceAll("_", " ");
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function backendStatusClass(status: string) {
  return status.toLowerCase().replaceAll("_", "-");
}

function fallbackImageForCrop(crop: string) {
  return lots.find((lot) => lot.crop.toLowerCase() === crop.toLowerCase())?.image ?? "/assets/crops/rice.png";
}

function formatLotQuantityKg(value: number) {
  if (value >= 1000) {
    return `${(value / 1000).toFixed(value % 1000 === 0 ? 0 : 1)} tons`;
  }

  return `${value.toLocaleString("en-US")} kg`;
}

function formatLotHarvest(value?: string) {
  if (!value) {
    return "Ready date not set";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Ready date not set";
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);
  const daysAway = Math.round((date.getTime() - today.getTime()) / 86_400_000);

  if (daysAway <= 0) {
    return "Ready today";
  }

  if (daysAway === 1) {
    return "Ready tomorrow";
  }

  if (daysAway === 2) {
    return "Ready in 2 days";
  }

  return "Ready soon";
}

function toApprovedSupplyLot(account: RegisteredAccount, lot: RegisteredCropLotRecord): CropLot | null {
  if (lot.status.toUpperCase() !== "ACTIVE") {
    return null;
  }

  return {
    ask: `৳${Math.round(lot.pricePerKg).toLocaleString("en-US")}/kg`,
    crop: lot.crop,
    district: lot.district || account.district,
    farmer: account.name,
    grade: lot.grade.replace(/^Grade\s+/i, ""),
    harvest: formatLotHarvest(lot.harvestDate),
    id: lot.id,
    image: lot.imageUrl || fallbackImageForCrop(lot.crop),
    postedAt: lot.createdAt,
    quantity: formatLotQuantityKg(lot.quantityKg),
    upazilla: lot.upazilla || account.upazilla,
  };
}

export function StatsPanel() {
  const t = useTranslate();
  const v = useValueText();

  return (
    <section className="stats-grid" aria-label={t("Business metrics")}>
      {dashboardStats.map((stat) => (
        <article className="stat-card dashboard-stat" key={stat.label}>
          <div className={`trend ${stat.trend}`}>
            <TrendIcon trend={stat.trend} />
          </div>
          <span>{t(stat.label)}</span>
          <strong>{v(stat.value)}</strong>
          <p>{t(stat.detail)}</p>
        </article>
      ))}
    </section>
  );
}

export function OrdersPanel({
  backendOrders,
  onOpenSection,
  orderError,
  searchTerm = "",
  wide = false,
}: {
  backendOrders?: BackendOrder[] | null;
  onOpenSection: OpenAdminSection;
  orderError?: string;
  searchTerm?: string;
  wide?: boolean;
}) {
  const language = useLanguage();
  const t = useTranslate();
  const v = useValueText();
  const displayOrders: OrderRow[] = backendOrders?.length
    ? backendOrders.map((order) => ({
        buyer: order.buyer.organization || order.buyer.name,
        crop: order.items.map((item) => item.crop.name).join(", ") || "Crop request",
        destination: order.deliveryAddress,
        eta: formatLocalizedDate(order.targetDate, language, "Target date pending", { day: "numeric", month: "short" }),
        id: order.id,
        quantity: formatOrderQuantity(backendQuantity(order)),
        status: formatBackendStatus(order.status),
        value: formatMoney(order.totalValue),
      }))
    : orders.map((order) => ({
        buyer: order.buyer,
        crop: order.crop,
        destination: order.destination,
        eta: order.status === "Matching" ? "3 farmer groups" : "Today",
        id: order.id,
        quantity: order.quantity,
        status: order.status,
        value: order.value,
      }));
  const searchedOrders = displayOrders.filter((order) =>
    matchesSearch(searchTerm, [
      order.id,
      order.buyer,
      t(order.buyer),
      order.crop,
      t(order.crop),
      order.destination,
      t(order.destination),
      order.eta,
      t(order.eta),
      order.quantity,
      order.status,
      t(order.status),
      order.value,
    ]),
  );

  return (
    <section className={`panel orders-panel ${wide ? "admin-wide-panel" : ""}`} aria-labelledby="orders-heading">
      <div className="panel-header">
        <div>
          <span>{t("Order control")}</span>
          <h2 id="orders-heading">{t("Buyer demand queue")}</h2>
        </div>
        <button className="secondary-button" type="button" onClick={() => onOpenSection("orders")}>
          {t("All orders")}
          <ChevronDown size={17} />
        </button>
      </div>
      {orderError && <p className="auth-error">{t(orderError)}</p>}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>{t("Order")}</th>
              <th>{t("Buyer")}</th>
              <th>{t("Crop")}</th>
              <th>{t("Quantity")}</th>
              <th>{t("Value")}</th>
              <th>{t("Status")}</th>
              <th>{t("ETA")}</th>
            </tr>
          </thead>
          <tbody>
            {searchedOrders.length === 0 && (
              <tr>
                <td colSpan={7}>
                  <em className="empty-table-note">{t("No results match your search")}</em>
                </td>
              </tr>
            )}
            {searchedOrders.map((order) => (
              <tr key={order.id}>
                <td>
                  <strong>{order.id}</strong>
                  <span>{t(order.destination)}</span>
                </td>
                <td>{t(order.buyer)}</td>
                <td>{t(order.crop)}</td>
                <td>{t(order.quantity)}</td>
                <td>{v(order.value)}</td>
                <td>
                  <em className={`status ${backendOrders?.length ? backendStatusClass(order.status) : statusClass(order.status as never)}`}>{t(order.status)}</em>
                </td>
                <td>{t(order.eta)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function PayoutPanel({ onOpenSection, wide = false }: { onOpenSection: OpenAdminSection; wide?: boolean }) {
  const t = useTranslate();
  const v = useValueText();

  return (
    <aside className={`panel action-panel ${wide ? "admin-wide-panel" : ""}`} aria-labelledby="release-heading">
      <div className="panel-header">
        <div>
          <span>{t("Payout action")}</span>
          <h2 id="release-heading">{t("Release queue")}</h2>
        </div>
        <HandCoins size={22} />
      </div>
      <div className="release-amount">
        <span>{t("Ready after QC")}</span>
        <strong>{v("৳82,000")}</strong>
      </div>
      <div className="checklist">
        <span>
          <CheckCircle2 size={18} />
          {t("Delivery photo received")}
        </span>
        <span>
          <CheckCircle2 size={18} />
          {t("Buyer weight confirmed")}
        </span>
        <span>
          <Clock3 size={18} />
          {t("Quality check pending")}
        </span>
      </div>
      <button className="primary-button full" type="button" onClick={() => onOpenSection("payouts")}>
        {t("Review payouts")}
      </button>
    </aside>
  );
}

export function VerificationPanel({
  onUpdateRegistration,
  registrations,
  searchTerm = "",
  verificationError,
  wide = false,
}: {
  onUpdateRegistration: (id: string, status: AccountStatus) => void;
  registrations: RegisteredAccount[];
  searchTerm?: string;
  verificationError?: string;
  wide?: boolean;
}) {
  const t = useTranslate();
  const v = useValueText();
  const searchedRegistrations = registrations.filter((account) => accountMatchesSearch(searchTerm, account, t));
  const pendingRegistrations = searchedRegistrations.filter((account) => account.status === "pending");
  const activeRegistrations = searchedRegistrations.filter((account) => account.status === "active");
  const rejectedRegistrations = searchedRegistrations.filter((account) => account.status === "rejected");

  return (
    <section className={`panel verification-panel ${wide ? "admin-wide-panel" : ""}`} aria-labelledby="verification-heading">
      <div className="panel-header">
        <div>
          <span>{t("Account verification")}</span>
          <h2 id="verification-heading">{t("Pending verification")}</h2>
        </div>
        <UserRoundCheck size={22} />
      </div>
      <p className="panel-copy">{t("Buyer and seller registrations awaiting admin approval.")}</p>
      {verificationError && <p className="auth-error">{t(verificationError)}</p>}
      <div className="verification-stats">
        <span>
          <strong>{v(pendingRegistrations.length)}</strong>
          {t("Pending verification")}
        </span>
        <span>
          <strong>{v(activeRegistrations.length)}</strong>
          {t("Approved accounts")}
        </span>
        <span>
          <strong>{v(rejectedRegistrations.length)}</strong>
          {t("Rejected accounts")}
        </span>
      </div>
      <div className="verification-list">
        {pendingRegistrations.length === 0 && <em>{t(searchTerm ? "No results match your search" : "No pending registrations")}</em>}
        {pendingRegistrations.map((account) => (
          <article className="verification-item" key={account.id}>
            <div>
              <strong>{account.name}</strong>
              <span>{t(account.role === "buyer" ? "Buyer" : "Seller / Farmer")}</span>
            </div>
            <div>
              <span>{account.organization}</span>
              <small>{account.phone}</small>
            </div>
            <p>
              <MapPin size={14} />
              {account.upazilla || account.district} · {account.focus}
            </p>
            <div className="verification-actions">
              <button className="secondary-button" type="button" onClick={() => onUpdateRegistration(account.id, "rejected")}>
                {t("Reject")}
              </button>
              <button className="primary-button" type="button" onClick={() => onUpdateRegistration(account.id, "active")}>
                <BadgeCheck size={17} />
                {t("Approve")}
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export function SupplyPanel({
  onOpenSection,
  registrations = [],
  searchTerm = "",
  showAllLots = false,
  wide = false,
}: {
  onOpenSection: OpenAdminSection;
  registrations?: RegisteredAccount[];
  searchTerm?: string;
  showAllLots?: boolean;
  wide?: boolean;
}) {
  const t = useTranslate();
  const v = useValueText();
  const approvedBackendLots = registrations
    .filter((account) => account.role === "farmer")
    .flatMap((account) => (account.cropLots ?? []).map((lot) => toApprovedSupplyLot(account, lot)).filter((lot): lot is CropLot => Boolean(lot)));
  const sourceLots = registrations.length > 0 ? approvedBackendLots : lots;
  const searchedLots = sourceLots.filter((lot) =>
    matchesSearch(searchTerm, [
      lot.id,
      lot.crop,
      t(lot.crop),
      lot.farmer,
      t(lot.farmer),
      lot.district,
      t(lot.district),
      lot.upazilla,
      lot.upazilla ? t(lot.upazilla) : "",
      lot.quantity,
      lot.ask,
      lot.grade,
      t(lot.grade),
      lot.harvest,
      t(lot.harvest),
      lot.postedAt,
    ]),
  );
  const displayLots = showAllLots ? searchedLots : searchedLots.slice(0, 3);

  return (
    <section className={`panel supply-panel ${wide ? "admin-wide-panel" : ""}`} aria-labelledby="supply-heading">
      <div className="panel-header">
        <div>
          <span>{t("Farmer supply")}</span>
          <h2 id="supply-heading">{t("Verified lots")}</h2>
        </div>
        <button className="secondary-button" type="button" onClick={() => onOpenSection("supply")}>
          <ClipboardCheck size={17} />
          {t("Grade lots")}
        </button>
      </div>

      <div className="supply-list">
        {displayLots.length === 0 ? (
          <p className="empty-table-note">{t(searchTerm ? "No results match your search" : "No approved lots yet")}</p>
        ) : displayLots.map((lot) => (
          <article className="supply-item" key={lot.id}>
            <img src={lot.image} alt={`${t(lot.crop)} ${t("supply")}`} />
            <div>
              <h3>{t(lot.crop)}</h3>
              <span>{t(lot.farmer)}</span>
              <p>
                <MapPin size={15} />
                {lot.upazilla ? `${t(lot.upazilla)}, ${t(lot.district)}` : t(lot.district)}
              </p>
            </div>
            <div>
              <strong>{t(lot.quantity)}</strong>
              <span>{v(lot.ask)}</span>
            </div>
            <div>
              <strong>{t("Grade")} {t(lot.grade)}</strong>
              <span>{t(lot.harvest)}</span>
            </div>
            <button className="icon-button" type="button" aria-label={`${t("Approve")} ${t(lot.crop)} ${t("lot")}`}>
              <BadgeCheck size={19} />
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}

export function PricePanel({ searchTerm = "", wide = false }: { searchTerm?: string; wide?: boolean }) {
  const t = useTranslate();
  const v = useValueText();
  const searchedPriceSignals = adminPriceSignals.filter((price) =>
    matchesSearch(searchTerm, [
      price.crop,
      t(price.crop),
      price.region,
      t(price.region),
      price.farmerAsk,
      price.wholesale,
      price.market,
    ]),
  );
  const averageRetailGap = Math.round(
    adminPriceSignals.reduce((total, price) => total + ((price.market - price.farmerAsk) / price.market) * 100, 0) /
      adminPriceSignals.length,
  );
  const averageFarmerShare = Math.round(
    adminPriceSignals.reduce((total, price) => total + (price.farmerAsk / price.market) * 100, 0) / adminPriceSignals.length,
  );
  const topSpread = adminPriceSignals.reduce((currentTop, price) =>
    price.market - price.farmerAsk > currentTop.market - currentTop.farmerAsk ? price : currentTop,
  );

  return (
    <section className={`panel price-panel ${wide ? "admin-wide-panel" : ""}`} aria-labelledby="price-heading">
      <div className="panel-header">
        <div>
          <span>{t("Price intelligence")}</span>
          <h2 id="price-heading">{t("Farmer vs market spread")}</h2>
        </div>
        <Banknote size={22} />
      </div>

      <div className="price-snapshot">
        <div>
          <span>{t("Avg retail gap")}</span>
          <strong>{v(`${averageRetailGap}%`)}</strong>
          <small>{t("Farmer ask to retail")}</small>
        </div>
        <div className="featured">
          <span>{t("Highest opportunity")}</span>
          <strong>{t(topSpread.crop)}</strong>
          <small>{v(`+৳${topSpread.market - topSpread.farmerAsk}/kg`)}</small>
        </div>
        <div>
          <span>{t("Farmer share")}</span>
          <strong>{v(`${averageFarmerShare}%`)}</strong>
          <small>{t("of retail price")}</small>
        </div>
      </div>

      <div className="price-signal-list">
        {searchedPriceSignals.length === 0 && <p className="empty-table-note">{t("No results match your search")}</p>}
        {searchedPriceSignals.map((price) => {
          const farmerWidth = (price.farmerAsk / price.market) * 100;
          const wholesaleWidth = (price.wholesale / price.market) * 100;
          const retailGap = price.market - price.farmerAsk;

          return (
            <article className="price-signal-row" key={price.crop}>
              <div className="price-signal-meta">
                <strong>{t(price.crop)}</strong>
                <span>{t(price.region)}</span>
              </div>
              <div className="price-signal-chart">
                <div className="price-scale">
                  <span>{t("Farmer ask")} {v(`৳${price.farmerAsk}`)}</span>
                  <span>{t("Wholesale")} {v(`৳${price.wholesale}`)}</span>
                </div>
                <div className="bar-stack" aria-label={`${t(price.crop)} ${t("price comparison")}`}>
                  <span className="farmer-bar" style={{ width: `${farmerWidth}%` }} />
                  <span className="wholesale-bar" style={{ width: `${wholesaleWidth}%` }} />
                </div>
              </div>
              <div className="price-signal-value">
                <span>{t("Retail")}</span>
                <strong>{v(`৳${price.market}/kg`)}</strong>
                <em>{t("Market gap")} {v(`+৳${retailGap}`)}</em>
              </div>
            </article>
          );
        })}
      </div>
      <div className="legend">
        <span>
          <i className="farmer" />
          {t("Farmer ask")}
        </span>
        <span>
          <i className="wholesale" />
          {t("Wholesale")}
        </span>
      </div>
    </section>
  );
}

export function LogisticsPanel({ searchTerm = "", wide = false }: { searchTerm?: string; wide?: boolean }) {
  const t = useTranslate();
  const searchedRoutes = adminRoutes.filter((route) =>
    matchesSearch(searchTerm, [
      route.route,
      t(route.route),
      route.driver,
      t(route.driver),
      route.lots,
      route.status,
      t(route.status),
      route.temperature,
    ]),
  );

  return (
    <section className={`panel logistics-panel ${wide ? "admin-wide-panel" : ""}`} aria-labelledby="logistics-heading">
      <div className="panel-header">
        <div>
          <span>{t("Logistics board")}</span>
          <h2 id="logistics-heading">{t("Routes in motion")}</h2>
        </div>
        <RouteIcon size={22} />
      </div>

      <div className="route-list">
        {searchedRoutes.length === 0 && <p className="empty-table-note">{t("No results match your search")}</p>}
        {searchedRoutes.map((route) => (
          <article className="route-item" key={route.route}>
            <div className="route-icon">
              <Truck size={20} />
            </div>
            <div>
              <h3>{t(route.route)}</h3>
              <span>{t(route.driver)}</span>
            </div>
            <div>
              <strong>{t(route.lots)}</strong>
              <span>{t(route.temperature)}</span>
            </div>
            <em>{t(route.status)}</em>
          </article>
        ))}
      </div>
    </section>
  );
}

export function MessagesPanel({ searchTerm = "" }: { searchTerm?: string }) {
  const t = useTranslate();
  const messages = [
    { icon: PackageCheck, text: "Tomato lot AKL-882 passed weight check." },
    { icon: CalendarDays, text: "Rangpur potato pickup moved to 8:20 PM." },
    { icon: UsersRound, text: "4 new farmers awaiting verification." },
  ].filter((message) => matchesSearch(searchTerm, [message.text, t(message.text)]));

  return (
    <aside className="panel messages-panel" aria-labelledby="messages-heading">
      <div className="panel-header">
        <div>
          <span>{t("Alerts")}</span>
          <h2 id="messages-heading">{t("Field updates")}</h2>
        </div>
        <MessageSquareText size={22} />
      </div>
      <div className="message-list">
        {messages.length === 0 && <em className="empty-table-note">{t("No results match your search")}</em>}
        {messages.map(({ icon: Icon, text }) => (
          <span key={text}>
            <Icon size={18} />
            {t(text)}
          </span>
        ))}
      </div>
    </aside>
  );
}

function formatQuantityKg(value?: number) {
  if (!value) {
    return "0 kg";
  }

  if (value >= 1000) {
    return `${(value / 1000).toFixed(value % 1000 === 0 ? 0 : 1)} tons`;
  }

  return `${value.toLocaleString("en-US")} kg`;
}

export function FarmerDirectoryPanel({
  onEditAccount,
  registrations = [],
}: {
  onEditAccount?: (account: RegisteredAccount) => void;
  registrations?: RegisteredAccount[];
}) {
  const t = useTranslate();
  const v = useValueText();
  const farmers = registrations.filter((account) => account.role === "farmer");

  return (
    <section className="panel verification-panel admin-wide-panel" aria-labelledby="farmer-directory-heading">
      <div className="panel-header">
        <div>
          <span>{t("Active accounts")}</span>
          <h2 id="farmer-directory-heading">{t("Verified farmer directory")}</h2>
        </div>
        <UsersRound size={22} />
      </div>
      <div className="verification-list">
        {farmers.length > 0 ? farmers.map((farmer) => (
          <article className="verification-item farmer-directory-item" key={farmer.id}>
            <div>
              <strong>{farmer.name}</strong>
              <span>{t("Seller / Farmer")}</span>
            </div>
            <div>
              <span>{farmer.organization || t("Business not added")}</span>
              <small>{farmer.phone}</small>
            </div>
            <p>
              <Sprout size={14} />
              {farmer.upazilla || farmer.district || t("District not added")} · {farmer.focus || t("Supply focus")}
            </p>
            <div className="admin-data-line">
              <span className="admin-data-chip">{t("Lot records")}: {v(farmer.cropLotCount ?? 0)}</span>
              <span className="admin-data-chip">{t("Quantity")}: {t(formatQuantityKg(farmer.cropLotQuantityKg))}</span>
              {farmer.latestLotSummary && <span className="admin-data-chip">{t("Latest lot")}: {farmer.latestLotSummary}</span>}
            </div>
            <div className={`account-status-chip ${farmer.status}`}>{t(farmer.status)}</div>
            {onEditAccount && (
              <button className="secondary-button compact-action" type="button" onClick={() => onEditAccount(farmer)}>
                <Pencil size={16} />
                {t("Edit")}
              </button>
            )}
          </article>
        )) : lots.map((lot) => (
          <article className="verification-item farmer-directory-item" key={`${lot.farmer}-${lot.crop}`}>
            <div>
              <strong>{t(lot.farmer)}</strong>
              <span>{t("Seller / Farmer")}</span>
            </div>
            <div>
              <span>{t("Farm coverage")}</span>
              <small>{t(lot.upazilla || lot.district)}</small>
            </div>
            <p>
              <Sprout size={14} />
              {t("Supply focus")}: {t(lot.crop)} · {t(lot.quantity)}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}

export function PayoutSettingsPanel() {
  const t = useTranslate();

  return (
    <section className="panel verification-panel admin-wide-panel" aria-labelledby="payment-settings-heading">
      <div className="panel-header">
        <div>
          <span>{t("Payout action")}</span>
          <h2 id="payment-settings-heading">{t("Payment protection settings")}</h2>
        </div>
        <ShieldCheck size={22} />
      </div>
      <div className="message-list">
        <span>
          <CheckCircle2 size={18} />
          {t("Buyer confirmation required")}
        </span>
        <span>
          <ClipboardCheck size={18} />
          {t("Quality check before release")}
        </span>
        <span>
          <WalletCards size={18} />
          {t("Mobile wallet review")}
        </span>
      </div>
    </section>
  );
}

export function SettingsPanel() {
  const t = useTranslate();

  return (
    <section className="panel verification-panel admin-wide-panel" aria-labelledby="settings-heading">
      <div className="panel-header">
        <div>
          <span>{t("Admin Control")}</span>
          <h2 id="settings-heading">{t("Platform settings")}</h2>
        </div>
        <Settings size={22} />
      </div>
      <div className="message-list">
        <span>
          <UserRoundCheck size={18} />
          {t("Registration approval stays manual")}
        </span>
        <span>
          <LockKeyhole size={18} />
          {t("Buyer and seller routes stay protected")}
        </span>
        <span>
          <MessageSquareText size={18} />
          {t("Bangla and English enabled")}
        </span>
      </div>
    </section>
  );
}
