import { useState } from "react";
import { BadgeCheck, Banknote, Bell, CalendarDays, CheckCircle2, ChevronDown, ClipboardCheck, Clock3, HandCoins, LayoutDashboard, LockKeyhole, MapPin, Menu, MessageSquareText, PackageCheck, Plus, Route as RouteIcon, Search, Settings, ShieldCheck, Sprout, Truck, UserRoundCheck, UsersRound, WalletCards, X } from "lucide-react";
import { adminNavItems, adminPriceSignals, adminRoutes, dashboardStats, lots, orders } from "../../data";
import { useTranslate, useValueText } from "../../i18n";
import type { AccountStatus, AdminSection, RegisteredAccount } from "../../types";
import { statusClass, TrendIcon } from "./pageHelpers";

export function AdminPage({
  onUpdateRegistration,
  registrations,
}: {
  onUpdateRegistration: (id: string, status: AccountStatus) => void;
  registrations: RegisteredAccount[];
}) {
  const t = useTranslate();
  const v = useValueText();
  const [activeAdminSection, setActiveAdminSection] = useState<AdminSection>("dashboard");
  const [adminMenuOpen, setAdminMenuOpen] = useState(false);
  const pendingRegistrations = registrations.filter((account) => account.status === "pending");
  const activeRegistrations = registrations.filter((account) => account.status === "active");
  const rejectedRegistrations = registrations.filter((account) => account.status === "rejected");
  const activeNavItem = adminNavItems.find((item) => item.id === activeAdminSection) ?? adminNavItems[0];
  const activeTitle = activeAdminSection === "dashboard" ? "Operations dashboard" : activeNavItem.label;
  const activeEyebrow = activeAdminSection === "dashboard" ? "Sunday, May 24" : activeNavItem.label;
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

  const openAdminSection = (section: AdminSection) => {
    setActiveAdminSection(section);
    setAdminMenuOpen(false);
  };

  const renderAdminNav = (className = "side-nav") => (
    <nav className={className} aria-label={t("Dashboard navigation")}>
      {adminNavItems.map((item) => {
        const Icon = item.icon;
        return (
          <button
            aria-current={activeAdminSection === item.id ? "page" : undefined}
            className={activeAdminSection === item.id ? "active" : ""}
            type="button"
            key={item.id}
            onClick={() => openAdminSection(item.id)}
          >
            <Icon size={19} />
            {t(item.label)}
          </button>
        );
      })}
    </nav>
  );

  const statsPanel = (
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

  const ordersPanel = (wide = false) => (
    <section className={`panel orders-panel ${wide ? "admin-wide-panel" : ""}`} aria-labelledby="orders-heading">
      <div className="panel-header">
        <div>
          <span>{t("Order control")}</span>
          <h2 id="orders-heading">{t("Buyer demand queue")}</h2>
        </div>
        <button className="secondary-button" type="button" onClick={() => openAdminSection("orders")}>
          {t("All orders")}
          <ChevronDown size={17} />
        </button>
      </div>

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
            {orders.map((order) => (
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
                  <em className={`status ${statusClass(order.status)}`}>{t(order.status)}</em>
                </td>
                <td>{order.status === "Matching" ? t("3 farmer groups") : t("Today")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );

  const payoutPanel = (wide = false) => (
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
      <button className="primary-button full" type="button" onClick={() => openAdminSection("payouts")}>
        {t("Review payouts")}
      </button>
    </aside>
  );

  const verificationPanel = (wide = false) => (
    <section className={`panel verification-panel ${wide ? "admin-wide-panel" : ""}`} aria-labelledby="verification-heading">
      <div className="panel-header">
        <div>
          <span>{t("Account verification")}</span>
          <h2 id="verification-heading">{t("Pending verification")}</h2>
        </div>
        <UserRoundCheck size={22} />
      </div>
      <p className="panel-copy">{t("Buyer and seller registrations awaiting admin approval.")}</p>
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
        {pendingRegistrations.length === 0 && <em>{t("No pending registrations")}</em>}
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
              {account.district} · {account.focus}
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

  const supplyPanel = (wide = false, showAllLots = false) => (
    <section className={`panel supply-panel ${wide ? "admin-wide-panel" : ""}`} aria-labelledby="supply-heading">
      <div className="panel-header">
        <div>
          <span>{t("Farmer supply")}</span>
          <h2 id="supply-heading">{t("Verified lots")}</h2>
        </div>
        <button className="secondary-button" type="button" onClick={() => openAdminSection("supply")}>
          <ClipboardCheck size={17} />
          {t("Grade lots")}
        </button>
      </div>

      <div className="supply-list">
        {(showAllLots ? lots : lots.slice(0, 3)).map((lot) => (
          <article className="supply-item" key={lot.id}>
            <img src={lot.image} alt={`${t(lot.crop)} ${t("supply")}`} />
            <div>
              <h3>{t(lot.crop)}</h3>
              <span>{t(lot.farmer)}</span>
              <p>
                <MapPin size={15} />
                {t(lot.district)}
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

  const pricePanel = (wide = false) => (
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
        {adminPriceSignals.map((price) => {
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

  const logisticsPanel = (wide = false) => (
    <section className={`panel logistics-panel ${wide ? "admin-wide-panel" : ""}`} aria-labelledby="logistics-heading">
      <div className="panel-header">
        <div>
          <span>{t("Logistics board")}</span>
          <h2 id="logistics-heading">{t("Routes in motion")}</h2>
        </div>
        <RouteIcon size={22} />
      </div>

      <div className="route-list">
        {adminRoutes.map((route) => (
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

  const messagesPanel = (
    <aside className="panel messages-panel" aria-labelledby="messages-heading">
      <div className="panel-header">
        <div>
          <span>{t("Alerts")}</span>
          <h2 id="messages-heading">{t("Field updates")}</h2>
        </div>
        <MessageSquareText size={22} />
      </div>
      <div className="message-list">
        <span>
          <PackageCheck size={18} />
          {t("Tomato lot AKL-882 passed weight check.")}
        </span>
        <span>
          <CalendarDays size={18} />
          {t("Rangpur potato pickup moved to 8:20 PM.")}
        </span>
        <span>
          <UsersRound size={18} />
          {t("4 new farmers awaiting verification.")}
        </span>
      </div>
    </aside>
  );

  const farmerDirectoryPanel = (
    <section className="panel verification-panel admin-wide-panel" aria-labelledby="farmer-directory-heading">
      <div className="panel-header">
        <div>
          <span>{t("Active accounts")}</span>
          <h2 id="farmer-directory-heading">{t("Verified farmer directory")}</h2>
        </div>
        <UsersRound size={22} />
      </div>
      <div className="verification-list">
        {lots.map((lot) => (
          <article className="verification-item farmer-directory-item" key={`${lot.farmer}-${lot.crop}`}>
            <div>
              <strong>{t(lot.farmer)}</strong>
              <span>{t("Seller / Farmer")}</span>
            </div>
            <div>
              <span>{t("Farm coverage")}</span>
              <small>{t(lot.district)}</small>
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

  const payoutSettingsPanel = (
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

  const settingsPanel = (
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

  const adminContent: Record<AdminSection, React.ReactNode> = {
    dashboard: (
      <>
        {statsPanel}
        <section className="dashboard-grid">
          {ordersPanel()}
          {payoutPanel()}
          {verificationPanel()}
          {supplyPanel()}
          {pricePanel()}
          {logisticsPanel()}
          {messagesPanel}
        </section>
      </>
    ),
    orders: (
      <section className="dashboard-grid admin-focused-grid">
        {ordersPanel(true)}
        {messagesPanel}
      </section>
    ),
    supply: (
      <section className="dashboard-grid admin-focused-grid">
        {supplyPanel(true, true)}
        {pricePanel(true)}
      </section>
    ),
    farmers: (
      <section className="dashboard-grid admin-focused-grid">
        {verificationPanel(true)}
        {farmerDirectoryPanel}
      </section>
    ),
    logistics: (
      <section className="dashboard-grid admin-focused-grid">
        {logisticsPanel(true)}
        {messagesPanel}
      </section>
    ),
    payouts: (
      <section className="dashboard-grid admin-focused-grid">
        {payoutPanel(true)}
        {payoutSettingsPanel}
      </section>
    ),
    settings: (
      <section className="dashboard-grid admin-focused-grid">
        {settingsPanel}
        {messagesPanel}
      </section>
    ),
  };

  return (
    <section className="dashboard-shell restored-dashboard">
      <aside className="sidebar" aria-label={t("Dashboard navigation")}>
        <div className="admin-brand">
          <LayoutDashboard size={22} />
          <div>
            <strong>{t("Admin Control")}</strong>
            <small>{t("Supply command")}</small>
          </div>
        </div>

        {renderAdminNav()}

        <div className="trust-summary">
          <ShieldCheck size={22} />
          <strong>{t("Escrow protected")}</strong>
          <span>{t("৳82,000 ready for farmer release after buyer confirmation.")}</span>
        </div>
      </aside>

      <div className="workspace dashboard-workspace">
        <header className="dashboard-topbar">
          <button
            className="mobile-menu"
            type="button"
            aria-expanded={adminMenuOpen}
            aria-label={t("Open admin navigation")}
            onClick={() => setAdminMenuOpen((value) => !value)}
          >
            {adminMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>

          <div className="page-title">
            <span>{t(activeEyebrow)}</span>
            <h1>{t(activeTitle)}</h1>
          </div>

          <div className="topbar-actions">
            <label className="global-search">
              <Search size={18} />
              <input value={t("Search order, farmer, district...")} readOnly aria-label={t("Search dashboard")} />
            </label>
            <button className="icon-button" type="button" aria-label={t("Notifications")}>
              <Bell size={19} />
            </button>
            <button className="primary-button" type="button" onClick={() => openAdminSection("supply")}>
              <Plus size={18} />
              {t("New lot")}
            </button>
          </div>
        </header>

        {renderAdminNav(`side-nav admin-mobile-nav ${adminMenuOpen ? "open" : ""}`)}

        {adminContent[activeAdminSection]}
      </div>
    </section>
  );
}
