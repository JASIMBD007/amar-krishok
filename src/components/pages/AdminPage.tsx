import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { LayoutDashboard, Menu, Plus, Search, ShieldCheck, X } from "lucide-react";
import {
  ApiRequestError,
  approveAdminPasswordResetRequest,
  createAdminAccount,
  deleteAdminAccount,
  fetchAdminAccounts,
  fetchAdminPasswordResetRequests,
  fetchMyOrders,
  rejectAdminPasswordResetRequest,
  reviewCropLot,
  toRegisteredCropLotRecord,
  updateAdminAccount,
  updateBackendVerification,
  updateCropLot,
  updateCropLotStatus,
  type AdminAccountPayload,
  type AdminPasswordResetRequest,
  type BackendOrder,
  type CropLotStatusUpdate,
  type UpdateCropLotPayload,
} from "../../api/auth";
import { countAdminChatAttention } from "../chat/chatUnread";
import { adminNavItems } from "../../data";
import { useTranslate, useValueText } from "../../i18n";
import type { AccountStatus, AdminSection, AuthUser, ChatThread, RegisteredAccount, RegisteredCropLotRecord } from "../../types";
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

function sectionFromSearch(search: string): AdminSection | null {
  const section = new URLSearchParams(search).get("section");
  return adminNavItems.some((item) => item.id === section) ? (section as AdminSection) : null;
}

export function AdminPage({
  chatThreads,
  onAdminReply,
  onThreadOpen,
  onUpdateRegistration,
  registrations,
  user,
}: {
  chatThreads: ChatThread[];
  onAdminReply: (threadId: string, text: string) => void;
  onThreadOpen: (threadId: string) => void;
  onUpdateRegistration: (id: string, status: AccountStatus) => void;
  registrations: RegisteredAccount[];
  user: AuthUser | null;
}) {
  const t = useTranslate();
  const v = useValueText();
  const location = useLocation();
  const navigate = useNavigate();
  const [activeAdminSection, setActiveAdminSection] = useState<AdminSection>("dashboard");
  const [adminMenuOpen, setAdminMenuOpen] = useState(false);
  const [backendOrders, setBackendOrders] = useState<BackendOrder[] | null>(null);
  const [backendPasswordResetRequests, setBackendPasswordResetRequests] = useState<AdminPasswordResetRequest[]>([]);
  const [backendRegistrations, setBackendRegistrations] = useState<RegisteredAccount[] | null>(null);
  const [orderError, setOrderError] = useState("");
  const [passwordResetError, setPasswordResetError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [verificationError, setVerificationError] = useState("");
  const activeNavItem = adminNavItems.find((item) => item.id === activeAdminSection) ?? adminNavItems[0];
  const activeTitle = activeAdminSection === "dashboard" ? "Operations dashboard" : activeNavItem.label;
  const activeEyebrow = activeAdminSection === "dashboard" ? "Sunday, May 24" : activeNavItem.label;
  const effectiveRegistrations = backendRegistrations ?? registrations;
  const adminChatBadgeCount = countAdminChatAttention(chatThreads);

  useEffect(() => {
    const nextSection = sectionFromSearch(location.search);
    if (nextSection && nextSection !== activeAdminSection) {
      setActiveAdminSection(nextSection);
      setAdminMenuOpen(false);
      return;
    }

    if (!nextSection && activeAdminSection !== "dashboard") {
      setActiveAdminSection("dashboard");
      setAdminMenuOpen(false);
    }
  }, [activeAdminSection, location.search]);

  useEffect(() => {
    if (user?.role !== "admin" || !user.accessToken) {
      return;
    }

    Promise.all([fetchAdminAccounts(user.accessToken), fetchMyOrders(user.accessToken), fetchAdminPasswordResetRequests(user.accessToken)])
      .then(([nextRegistrations, nextOrders, nextPasswordResetRequests]) => {
        setBackendRegistrations(nextRegistrations);
        setBackendOrders(nextOrders);
        setBackendPasswordResetRequests(nextPasswordResetRequests);
        setOrderError("");
        setPasswordResetError("");
        setVerificationError("");
      })
      .catch((error) => {
        const message = error instanceof ApiRequestError ? error.message : "Backend service is unavailable. Please try again.";
        setOrderError(message);
        setPasswordResetError(message);
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

  const applyManagedLot = (nextLot: RegisteredCropLotRecord, farmerId: string) => {
    setBackendRegistrations((current) =>
      (current ?? registrations).map((account) => {
        if (account.id !== farmerId) {
          return account;
        }

        const existingLots = account.cropLots ?? [];
        const cropLots = existingLots.some((item) => item.id === nextLot.id)
          ? existingLots.map((item) => (item.id === nextLot.id ? nextLot : item))
          : [nextLot, ...existingLots];

        return {
          ...account,
          cropLots,
          cropLotCount: cropLots.length,
          cropLotQuantityKg: cropLots.reduce((total, item) => total + item.quantityKg, 0),
          latestLotStatus: cropLots[0]?.status,
          latestLotSummary: cropLots[0] ? `${cropLots[0].crop} · ${cropLots[0].upazilla || cropLots[0].district}` : account.latestLotSummary,
        };
      }),
    );
  };

  const reviewManagedLot = async (lotId: string, action: "approve" | "reject") => {
    if (!user?.accessToken) {
      throw new Error("Backend service is unavailable. Please try again.");
    }

    const lot = await reviewCropLot(user.accessToken, lotId, action);
    const nextLot = toRegisteredCropLotRecord(lot);
    applyManagedLot(nextLot, lot.farmer.id);
    setVerificationError("");
  };

  const updateManagedLot = async (lotId: string, payload: UpdateCropLotPayload) => {
    if (!user?.accessToken) {
      throw new Error("Backend service is unavailable. Please try again.");
    }

    const lot = await updateCropLot(user.accessToken, lotId, payload);
    const nextLot = toRegisteredCropLotRecord(lot);
    applyManagedLot(nextLot, lot.farmer.id);
    setVerificationError("");
    return nextLot;
  };

  const updateManagedLotStatus = async (lotId: string, status: CropLotStatusUpdate) => {
    if (!user?.accessToken) {
      throw new Error("Backend service is unavailable. Please try again.");
    }

    const lot = await updateCropLotStatus(user.accessToken, lotId, status);
    const nextLot = toRegisteredCropLotRecord(lot);
    applyManagedLot(nextLot, lot.farmer.id);
    setVerificationError("");
    return nextLot;
  };

  const approvePasswordReset = async (id: string) => {
    if (!user?.accessToken) {
      throw new Error("Backend service is unavailable. Please try again.");
    }

    const request = await approveAdminPasswordResetRequest(user.accessToken, id);
    setBackendPasswordResetRequests((current) => current.map((item) => (item.id === id ? request : item)));
    setPasswordResetError("");
  };

  const rejectPasswordReset = async (id: string) => {
    if (!user?.accessToken) {
      throw new Error("Backend service is unavailable. Please try again.");
    }

    const request = await rejectAdminPasswordResetRequest(user.accessToken, id);
    setBackendPasswordResetRequests((current) => current.map((item) => (item.id === id ? request : item)));
    setPasswordResetError("");
  };

  const openAdminSection = (section: AdminSection) => {
    setActiveAdminSection(section);
    setAdminMenuOpen(false);
    navigate(section === "dashboard" ? "/admin" : `/admin?section=${section}`, { replace: true });
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
            <span className="side-nav-label">{t(item.label)}</span>
            {item.id === "chat" && adminChatBadgeCount > 0 && (
              <span className="chat-nav-badge" aria-label={t("Unread chat messages")}>
                {v(adminChatBadgeCount)}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );

  const renderActiveSection = () => {
    switch (activeAdminSection) {
      case "orders":
        return <OrdersSection backendOrders={backendOrders} onOpenSection={openAdminSection} orderError={orderError} searchTerm={searchTerm} />;
      case "buyers":
        return (
          <BuyersSection
            accessToken={user?.accessToken}
            registrations={effectiveRegistrations}
            onCreateAccount={createManagedAccount}
            onDeleteAccount={deleteManagedAccount}
            searchTerm={searchTerm}
            onUpdateAccount={updateManagedAccount}
            onUpdateRegistration={updateRegistration}
            verificationError={verificationError}
          />
        );
      case "supply":
        return <SupplyLotsSection onOpenSection={openAdminSection} registrations={effectiveRegistrations} searchTerm={searchTerm} />;
      case "farmers":
        return (
          <FarmersSection
            accessToken={user?.accessToken}
            registrations={effectiveRegistrations}
            onCreateAccount={createManagedAccount}
            onDeleteAccount={deleteManagedAccount}
            onUpdateAccount={updateManagedAccount}
            onUpdateLot={updateManagedLot}
            onUpdateLotStatus={updateManagedLotStatus}
            onReviewLot={reviewManagedLot}
            searchTerm={searchTerm}
            onUpdateRegistration={updateRegistration}
            verificationError={verificationError}
          />
        );
      case "logistics":
        return <LogisticsSection searchTerm={searchTerm} />;
      case "payouts":
        return <PayoutsSection onOpenSection={openAdminSection} searchTerm={searchTerm} />;
      case "chat":
        return <ChatSection chatThreads={chatThreads} onAdminReply={onAdminReply} onThreadOpen={onThreadOpen} searchTerm={searchTerm} />;
      case "settings":
        return (
          <SettingsSection
            onApprovePasswordReset={approvePasswordReset}
            onRejectPasswordReset={rejectPasswordReset}
            passwordResetError={passwordResetError}
            passwordResetRequests={backendPasswordResetRequests}
            searchTerm={searchTerm}
          />
        );
      case "dashboard":
      default:
        return (
          <DashboardSection
            onOpenSection={openAdminSection}
            backendOrders={backendOrders}
            orderError={orderError}
            registrations={effectiveRegistrations}
            searchTerm={searchTerm}
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
              <input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder={t("Search order, farmer, district...")}
                aria-label={t("Search dashboard")}
              />
            </label>
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
