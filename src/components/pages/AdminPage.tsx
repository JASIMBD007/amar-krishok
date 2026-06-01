import { useEffect, useState } from "react";
import { Bell, LayoutDashboard, Menu, Plus, Search, ShieldCheck, X } from "lucide-react";
import { ApiRequestError, fetchAdminAccounts, updateBackendVerification } from "../../api/auth";
import { adminNavItems } from "../../data";
import { useTranslate } from "../../i18n";
import type { AccountStatus, AdminSection, AuthUser, ChatThread, RegisteredAccount } from "../../types";
import {
  BuyersSection,
  ChatSection,
  DashboardSection,
  FarmersSection,
  LogisticsSection,
  OrdersSection,
  PayoutsSection,
  SettingsSection,
  SupplyLotsSection,
} from "./admin";

export function AdminPage({
  chatThreads,
  onAdminReply,
  onUpdateRegistration,
  registrations,
  user,
}: {
  chatThreads: ChatThread[];
  onAdminReply: (threadId: string, text: string) => void;
  onUpdateRegistration: (id: string, status: AccountStatus) => void;
  registrations: RegisteredAccount[];
  user: AuthUser | null;
}) {
  const t = useTranslate();
  const [activeAdminSection, setActiveAdminSection] = useState<AdminSection>("dashboard");
  const [adminMenuOpen, setAdminMenuOpen] = useState(false);
  const [backendRegistrations, setBackendRegistrations] = useState<RegisteredAccount[] | null>(null);
  const [verificationError, setVerificationError] = useState("");
  const activeNavItem = adminNavItems.find((item) => item.id === activeAdminSection) ?? adminNavItems[0];
  const activeTitle = activeAdminSection === "dashboard" ? "Operations dashboard" : activeNavItem.label;
  const activeEyebrow = activeAdminSection === "dashboard" ? "Sunday, May 24" : activeNavItem.label;
  const effectiveRegistrations = backendRegistrations ?? registrations;

  useEffect(() => {
    if (user?.role !== "admin" || !user.accessToken) {
      return;
    }

    fetchAdminAccounts(user.accessToken)
      .then((nextRegistrations) => {
        setBackendRegistrations(nextRegistrations);
        setVerificationError("");
      })
      .catch((error) => {
        setVerificationError(error instanceof ApiRequestError ? error.message : "Backend service is unavailable. Please try again.");
      });
  }, [user?.accessToken, user?.role]);

  const updateRegistration = (id: string, status: AccountStatus) => {
    if (!user?.accessToken) {
      onUpdateRegistration(id, status);
      return;
    }

    updateBackendVerification(user.accessToken, id, status)
      .then(() => {
        setBackendRegistrations((current) => current?.filter((account) => account.id !== id) ?? null);
        setVerificationError("");
      })
      .catch((error) => {
        setVerificationError(error instanceof ApiRequestError ? error.message : "Backend service is unavailable. Please try again.");
      });
  };

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

  const renderActiveSection = () => {
    switch (activeAdminSection) {
      case "orders":
        return <OrdersSection onOpenSection={openAdminSection} />;
      case "buyers":
        return <BuyersSection registrations={effectiveRegistrations} onUpdateRegistration={updateRegistration} verificationError={verificationError} />;
      case "supply":
        return <SupplyLotsSection onOpenSection={openAdminSection} />;
      case "farmers":
        return <FarmersSection registrations={effectiveRegistrations} onUpdateRegistration={updateRegistration} verificationError={verificationError} />;
      case "logistics":
        return <LogisticsSection />;
      case "payouts":
        return <PayoutsSection onOpenSection={openAdminSection} />;
      case "chat":
        return <ChatSection chatThreads={chatThreads} onAdminReply={onAdminReply} />;
      case "settings":
        return <SettingsSection />;
      case "dashboard":
      default:
        return (
          <DashboardSection
            onOpenSection={openAdminSection}
            registrations={effectiveRegistrations}
            onUpdateRegistration={updateRegistration}
            verificationError={verificationError}
          />
        );
    }
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

        {renderActiveSection()}
      </div>
    </section>
  );
}
