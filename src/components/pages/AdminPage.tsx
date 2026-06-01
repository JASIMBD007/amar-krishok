import { useEffect, useMemo, useState } from "react";
import { LayoutDashboard, Menu, Plus, Search, ShieldCheck, X } from "lucide-react";
import {
  ApiRequestError,
  createAdminAccount,
  deleteAdminAccount,
  fetchAdminNotifications,
  fetchAdminAccounts,
  fetchMyOrders,
  markAdminNotificationRead,
  markAllAdminNotificationsRead,
  updateAdminAccount,
  updateBackendVerification,
  type AdminAccountPayload,
  type BackendAdminNotification,
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
import { AdminNotifications, type AdminNotification, type AdminNotificationTone, type AdminNotificationType } from "./admin/AdminNotifications";

const notificationTones: AdminNotificationTone[] = ["info", "success", "urgent", "warning"];
const notificationTypes: AdminNotificationType[] = ["account", "chat", "logistics", "order", "payout", "supply", "system"];

function isAdminSection(value: string): value is AdminSection {
  return adminNavItems.some((item) => item.id === value);
}

function isNotificationTone(value: string): value is AdminNotificationTone {
  return notificationTones.includes(value as AdminNotificationTone);
}

function isNotificationType(value: string): value is AdminNotificationType {
  return notificationTypes.includes(value as AdminNotificationType);
}

function toAdminNotification(notification: BackendAdminNotification): AdminNotification {
  return {
    body: notification.body,
    createdAt: notification.createdAt,
    id: notification.id,
    meta: notification.meta,
    readAt: notification.readAt,
    section: isAdminSection(notification.section) ? notification.section : "settings",
    title: notification.title,
    tone: isNotificationTone(notification.tone) ? notification.tone : "info",
    type: isNotificationType(notification.type) ? notification.type : "system",
  };
}

function getLatestParticipantMessage(thread: ChatThread) {
  return [...thread.messages].reverse().find((message) => message.senderRole !== "admin");
}

function getOrderCropSummary(order: BackendOrder) {
  return order.items.map((item) => item.crop.name).filter(Boolean).join(", ") || "Order items";
}

function getOrderStatusMeta(status: string) {
  const normalizedStatus = status.toLowerCase();

  if (normalizedStatus.includes("pending")) {
    return "Pending order";
  }

  if (normalizedStatus.includes("quality")) {
    return "Quality check";
  }

  if (normalizedStatus.includes("transit")) {
    return "In transit";
  }

  if (normalizedStatus.includes("matching")) {
    return "Matching";
  }

  return status;
}

function makeAdminNotifications({
  chatThreads,
  orders,
  orderError,
  registrations,
  notificationError,
  verificationError,
}: {
  chatThreads: ChatThread[];
  orders: BackendOrder[] | null;
  notificationError: string;
  orderError: string;
  registrations: RegisteredAccount[];
  verificationError: string;
}) {
  const notifications: AdminNotification[] = [];

  if (notificationError) {
    notifications.push({
      body: notificationError,
      id: `system-notifications-${notificationError}`,
      meta: "Backend service",
      section: "settings",
      title: "Notification sync issue",
      tone: "urgent",
      type: "system",
    });
  }

  if (orderError) {
    notifications.push({
      body: orderError,
      id: `system-orders-${orderError}`,
      meta: "Backend service",
      section: "settings",
      title: "Order sync issue",
      tone: "urgent",
      type: "system",
    });
  }

  if (verificationError && verificationError !== orderError) {
    notifications.push({
      body: verificationError,
      id: `system-accounts-${verificationError}`,
      meta: "Account verification",
      section: "buyers",
      title: "Account sync issue",
      tone: "urgent",
      type: "system",
    });
  }

  [...chatThreads]
    .filter((thread) => thread.status === "waiting" || thread.messages[thread.messages.length - 1]?.senderRole !== "admin")
    .sort((first, second) => new Date(second.updatedAt).getTime() - new Date(first.updatedAt).getTime())
    .slice(0, 4)
    .forEach((thread) => {
      const latestMessage = getLatestParticipantMessage(thread);
      notifications.push({
        body: `${thread.participantName}: ${latestMessage?.text ?? thread.subject}`,
        id: `chat-${thread.id}-${latestMessage?.id ?? thread.updatedAt}`,
        meta: thread.participantRole === "buyer" ? "Buyer chat" : thread.participantRole === "farmer" ? "Farmer chat" : "Guest chat",
        section: "chat",
        title: "New chat message",
        tone: "urgent",
        type: "chat",
      });
    });

  registrations
    .filter((account) => account.status === "pending")
    .sort((first, second) => new Date(second.submittedAt).getTime() - new Date(first.submittedAt).getTime())
    .slice(0, 5)
    .forEach((account) => {
      notifications.push({
        body: `${account.name} · ${account.district || account.organization || account.phone}`,
        id: `account-${account.id}-${account.submittedAt}`,
        meta: "Pending verification",
        section: account.role === "buyer" ? "buyers" : "farmers",
        title: account.role === "buyer" ? "Buyer verification request" : "Farmer verification request",
        tone: "warning",
        type: "account",
      });
    });

  const activeOrders = (orders ?? []).filter((order) => !["COMPLETED", "CANCELLED"].includes(order.status.toUpperCase()));
  activeOrders
    .sort((first, second) => new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime())
    .slice(0, 4)
    .forEach((order) => {
      notifications.push({
        body: `${order.buyer.name} · ${getOrderCropSummary(order)} · ${order.district.name}`,
        id: `order-${order.id}-${order.updatedAt}`,
        meta: getOrderStatusMeta(order.status),
        section: "orders",
        title: "Order request needs review",
        tone: order.status.toLowerCase().includes("pending") ? "urgent" : "info",
        type: "order",
      });
    });

  const qualityOrTransitOrders = activeOrders.filter((order) => {
    const status = order.status.toLowerCase();
    return status.includes("quality") || status.includes("transit") || status.includes("delivered");
  });

  if (qualityOrTransitOrders.length > 0) {
    notifications.push({
      body: "Check delivery proof, buyer confirmation, and farmer payout release.",
      id: `payout-qc-${qualityOrTransitOrders.length}`,
      meta: "Active order follow-up",
      section: "payouts",
      title: "QC or payout follow-up",
      tone: "success",
      type: "payout",
    });
  }

  if (activeOrders.length >= 3) {
    notifications.push({
      body: "Review pickup windows before dispatch timing slips.",
      id: `logistics-watch-${activeOrders.length}`,
      meta: "Route timing watch",
      section: "logistics",
      title: "Logistics queue is getting busy",
      tone: "info",
      type: "logistics",
    });
  }

  return notifications.slice(0, 12);
}

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
  const [backendNotifications, setBackendNotifications] = useState<AdminNotification[] | null>(null);
  const [notificationPanelOpen, setNotificationPanelOpen] = useState(false);
  const [reviewedNotificationIds, setReviewedNotificationIds] = useState<string[]>([]);
  const [notificationError, setNotificationError] = useState("");
  const [orderError, setOrderError] = useState("");
  const [verificationError, setVerificationError] = useState("");
  const activeNavItem = adminNavItems.find((item) => item.id === activeAdminSection) ?? adminNavItems[0];
  const activeTitle = activeAdminSection === "dashboard" ? "Operations dashboard" : activeNavItem.label;
  const activeEyebrow = activeAdminSection === "dashboard" ? "Sunday, May 24" : activeNavItem.label;
  const effectiveRegistrations = backendRegistrations ?? registrations;
  const adminNotifications = useMemo(
    () =>
      makeAdminNotifications({
        chatThreads,
        notificationError,
        orders: backendOrders,
        orderError,
        registrations: effectiveRegistrations,
        verificationError,
      }),
    [backendOrders, chatThreads, effectiveRegistrations, notificationError, orderError, verificationError],
  );
  const activeNotifications = backendNotifications ?? adminNotifications;

  useEffect(() => {
    if (user?.role !== "admin" || !user.accessToken) {
      setBackendNotifications(null);
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

    fetchAdminNotifications(user.accessToken)
      .then((notifications) => {
        setBackendNotifications(notifications.map(toAdminNotification));
        setNotificationError("");
      })
      .catch((error) => {
        setBackendNotifications(null);
        setNotificationError(error instanceof ApiRequestError ? error.message : "Backend service is unavailable. Please try again.");
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
    setNotificationPanelOpen(false);
  };

  const openNotification = (notification: AdminNotification) => {
    setReviewedNotificationIds((current) => (current.includes(notification.id) ? current : [...current, notification.id]));

    if (user?.accessToken && backendNotifications?.some((item) => item.id === notification.id) && !notification.readAt) {
      const optimisticReadAt = new Date().toISOString();
      setBackendNotifications((current) =>
        current?.map((item) => (item.id === notification.id ? { ...item, readAt: optimisticReadAt } : item)) ?? current,
      );
      markAdminNotificationRead(user.accessToken, notification.id)
        .then((updatedNotification) => {
          setBackendNotifications((current) =>
            current?.map((item) => (item.id === notification.id ? toAdminNotification(updatedNotification) : item)) ?? current,
          );
          setNotificationError("");
        })
        .catch((error) => {
          setNotificationError(error instanceof ApiRequestError ? error.message : "Backend service is unavailable. Please try again.");
        });
    }

    setNotificationPanelOpen(false);
    openAdminSection(notification.section);
  };

  const markAllNotificationsReviewed = () => {
    setReviewedNotificationIds((current) => Array.from(new Set([...current, ...activeNotifications.map((notification) => notification.id)])));

    if (user?.accessToken && backendNotifications) {
      const optimisticReadAt = new Date().toISOString();
      setBackendNotifications((current) => current?.map((notification) => ({ ...notification, readAt: notification.readAt ?? optimisticReadAt })) ?? current);
      markAllAdminNotificationsRead(user.accessToken)
        .then(() => setNotificationError(""))
        .catch((error) => {
          setNotificationError(error instanceof ApiRequestError ? error.message : "Backend service is unavailable. Please try again.");
        });
    }
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
            <AdminNotifications
              notifications={activeNotifications}
              onMarkAllReviewed={markAllNotificationsReviewed}
              onOpenNotification={openNotification}
              onToggle={() => setNotificationPanelOpen((value) => !value)}
              open={notificationPanelOpen}
              reviewedIds={reviewedNotificationIds}
            />
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
