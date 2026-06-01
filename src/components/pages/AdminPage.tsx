import { useEffect, useState } from "react";
import { Bell, LayoutDashboard, Menu, Plus, Search, ShieldCheck, X } from "lucide-react";
import {
  ApiRequestError,
  createAdminAccount,
  deleteAdminAccount,
  fetchAdminAccounts,
  fetchMyOrders,
  updateAdminAccount,
  updateBackendVerification,
  type AdminAccountPayload,
  type BackendOrder,
} from "../../api/auth";
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
  const [backendOrders, setBackendOrders] = useState<BackendOrder[] | null>(null);
  const [backendRegistrations, setBackendRegistrations] = useState<RegisteredAccount[] | null>(null);
  const [orderError, setOrderError] = useState("");
  const [verificationError, setVerificationError] = useState("");
  const activeNavItem = adminNavItems.find((item) => item.id === activeAdminSection) ?? adminNavItems[0];
  const activeTitle = activeAdminSection === "dashboard" ? "Operations dashboard" : activeNavItem.label;
  const activeEyebrow = activeAdminSection === "dashboard" ? "Sunday, May 24" : activeNavItem.label;
  const effectiveRegistrations = backendRegistrations ?? registrations;

  useEffect(() => {
    if (user?.role !== "admin" || !user.accessToken) {
      return;
    }

    Promise.all([fetchAdminAccounts(user.accessToken), fetchMyOrders(user.accessToken)])
      .then(([nextRegistrations, nextOrders]) => {
        setBackendRegistrations(nextRegistrations);
        setBackendOrders(nextOrders);
        setOrderError("");
        setVerificationError("");
      })
      .catch((error) => {
        const message = error instanceof ApiRequestError ? error.message : "Backend service is unavailable. Please try again.";
        setOrderError(message);
        setVerificationError(message);
      });
  }, [user?.accessToken, user?.role]);

  const updateRegistration = (id: string, status: AccountStatus) => {
    if (!user?.accessToken) {
      onUpdateRegistration(id, status);
      return;
    }

    updateBackendVerification(user.accessToken, id, status)
      .then((account) => {
        setBackendRegistrations((current) => (current ?? registrations).map((item) => (item.id === id ? account : item)));
        setVerificationError("");
      })
      .catch((error) => {
        setVerificationError(error instanceof ApiRequestError ? error.message : "Backend service is unavailable. Please try again.");
      });
  };

  const createManagedAccount = async (payload: AdminAccountPayload) => {
    if (!user?.accessToken) {
      throw new Error("Backend service is unavailable. Please try again.");
    }

    const account = await createAdminAccount(user.accessToken, payload);
    setBackendRegistrations((current) => [account, ...(current ?? registrations)]);
    setVerificationError("");
  };

  const updateManagedAccount = async (id: string, payload: Partial<AdminAccountPayload>) => {
    if (!user?.accessToken) {
      throw new Error("Backend service is unavailable. Please try again.");
    }

    const account = await updateAdminAccount(user.accessToken, id, payload);
    setBackendRegistrations((current) => (current ?? registrations).map((item) => (item.id === id ? account : item)));
    setVerificationError("");
  };

  const deleteManagedAccount = async (id: string) => {
    if (!user?.accessToken) {
      throw new Error("Backend service is unavailable. Please try again.");
    }

    await deleteAdminAccount(user.accessToken, id);
    setBackendRegistrations((current) => (current ?? registrations).filter((item) => item.id !== id));
    setVerificationError("");
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
        return <OrdersSection backendOrders={backendOrders} onOpenSection={openAdminSection} orderError={orderError} />;
      case "buyers":
        return (
          <BuyersSection
            registrations={effectiveRegistrations}
            onCreateAccount={createManagedAccount}
            onDeleteAccount={deleteManagedAccount}
            onUpdateAccount={updateManagedAccount}
            onUpdateRegistration={updateRegistration}
            verificationError={verificationError}
          />
        );
      case "supply":
        return <SupplyLotsSection onOpenSection={openAdminSection} />;
      case "farmers":
        return (
          <FarmersSection
            registrations={effectiveRegistrations}
            onCreateAccount={createManagedAccount}
            onDeleteAccount={deleteManagedAccount}
            onUpdateAccount={updateManagedAccount}
            onUpdateRegistration={updateRegistration}
            verificationError={verificationError}
          />
        );
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
            backendOrders={backendOrders}
            orderError={orderError}
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
