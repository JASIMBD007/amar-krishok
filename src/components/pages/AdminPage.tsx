import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  BadgeCheck,
  BarChart3,
  Check,
  History,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  Package,
  Shield,
  Sprout,
  Users,
} from "lucide-react";
import {
  ApiRequestError,
  fetchAdminAccounts,
  updateBackendVerification,
} from "../../api/auth";
import { useTranslate } from "../../i18n";
import type {
  AccountStatus,
  AuthUser,
  ChatThread,
  RegisteredAccount,
} from "../../types";
import { MarketSection, type MarketTab } from "./admin";
import {
  AdminActivity,
  AdminDashboard,
  AdminDisputes,
  AdminInbox,
  AdminRoles,
  AdminUsers,
  SupportScopePill,
  type AdminConsoleSection,
  type AdminStaffRole,
} from "./admin/AdminConsoleSections";

const SECTION_META: Record<AdminConsoleSection, { path: string; title: string; subtitle: string }> = {
  overview: { path: "dashboard", title: "Dashboard", subtitle: "Platform health for today · 08:00 · all figures live" },
  activity: { path: "activity", title: "Activity log", subtitle: "Every staff action on the platform, newest first" },
  orders: { path: "orders", title: "Orders & escrow", subtitle: "Release, refund or dispute any escrow held on the platform" },
  verification: { path: "verification", title: "Verification queue", subtitle: "Farmers waiting for NID and land-record checks" },
  listings: { path: "listings", title: "Listing moderation", subtitle: "Suspend listings that break the pricing or photo rules" },
  rates: { path: "rates", title: "Rate publishing", subtitle: "Published rates drive every fair-price panel on the platform" },
  users: { path: "users", title: "Users", subtitle: "Buyers and farmers — open a record to edit, restrict or message" },
  disputes: { path: "disputes", title: "Disputes", subtitle: "Open claims with escrow frozen · SLA 24 h" },
  inbox: { path: "inbox", title: "Support inbox", subtitle: "Conversations escalated to staff from buyers and farmers" },
  roles: { path: "roles", title: "Roles & access", subtitle: "Who can do what inside the console" },
};

const NAV_GROUPS = [
  {
    title: "Overview",
    items: [
      { section: "overview" as const, label: "Dashboard", icon: LayoutDashboard },
      { section: "activity" as const, label: "Activity log", icon: History },
    ],
  },
  {
    title: "Operations",
    items: [
      { section: "orders" as const, label: "Orders & escrow", icon: Package },
      { section: "verification" as const, label: "Verification", icon: BadgeCheck },
      { section: "listings" as const, label: "Listings", icon: Sprout },
      { section: "rates" as const, label: "Rate publishing", icon: BarChart3, superOnly: true },
    ],
  },
  {
    title: "People & support",
    items: [
      { section: "users" as const, label: "Users", icon: Users },
      { section: "disputes" as const, label: "Disputes", icon: AlertTriangle },
      { section: "inbox" as const, label: "Support inbox", icon: MessageSquare },
    ],
  },
  {
    title: "Platform",
    items: [{ section: "roles" as const, label: "Roles & access", icon: Shield, superOnly: true }],
  },
];

function sectionFromPath(pathname: string): AdminConsoleSection {
  const key = pathname.split("/").filter(Boolean).at(-1);
  return (Object.entries(SECTION_META).find(([, meta]) => meta.path === key)?.[0] as AdminConsoleSection | undefined) ?? "overview";
}

function getInitials(name: string) {
  return name
    .replace(/^(Md\.|Mst\.|Mrs\.|Mr\.)\s*/i, "")
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function AdminPage({
  chatThreads,
  onAdminReply,
  onLogout,
  onThreadOpen,
  onUpdateRegistration,
  openDisputeCount,
  orderCount,
  registrations,
  user,
}: {
  chatThreads: ChatThread[];
  onAdminReply: (threadId: string, text: string) => void;
  onLogout: () => void;
  onThreadOpen: (threadId: string) => void;
  onUpdateRegistration: (id: string, status: AccountStatus) => void;
  openDisputeCount: number;
  orderCount: number;
  registrations: RegisteredAccount[];
  user: AuthUser | null;
}) {
  const t = useTranslate();
  const location = useLocation();
  const navigate = useNavigate();
  const section = sectionFromPath(location.pathname);
  const [staffRole, setStaffRole] = useState<AdminStaffRole>("super");
  const [backendRegistrations, setBackendRegistrations] = useState<RegisteredAccount[] | null>(null);
  const [verificationError, setVerificationError] = useState("");
  const [notice, setNotice] = useState("");
  const accounts = backendRegistrations ?? registrations;

  useEffect(() => {
    if (user?.role !== "admin" || !user.accessToken) return;
    fetchAdminAccounts(user.accessToken)
      .then((nextAccounts) => {
        setBackendRegistrations(nextAccounts);
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
      .then((account) => {
        setBackendRegistrations((current) => (current ?? registrations).map((item) => (item.id === id ? account : item)));
        setVerificationError("");
      })
      .catch((error) => {
        setVerificationError(error instanceof ApiRequestError ? error.message : "Backend service is unavailable. Please try again.");
      });
  };

  const badgeCounts = useMemo(() => ({
    orders: orderCount,
    verification: accounts.filter((account) => account.role === "farmer" && account.status === "pending").length,
    disputes: Math.max(3, openDisputeCount),
    inbox: chatThreads.filter((thread) => thread.status === "waiting").length || 2,
  }), [accounts, chatThreads, openDisputeCount, orderCount]);

  const openSection = (next: AdminConsoleSection) => {
    navigate(`/admin/${SECTION_META[next].path}`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const switchRole = (nextRole: AdminStaffRole) => {
    setStaffRole(nextRole);
    if (nextRole === "support" && (section === "rates" || section === "roles")) openSection("overview");
  };

  const operationTab: MarketTab | null = section === "orders"
    ? "escrow"
    : section === "verification"
      ? "verification"
      : section === "listings"
        ? "listings"
        : section === "rates"
          ? "rates"
          : null;

  const meta = SECTION_META[section];

  return (
    <section className="admin-console-shell">
      <aside className="admin-console-sidebar">
        <div className="admin-console-brand"><i><Shield size={16} /></i><span><strong>{t("Admin console")}</strong><small>{t("AmarKrishok operations")}</small></span></div>
        <div className="admin-role-switcher">
          <span>{t("Viewing as")}</span>
          <div>
            <button className={staffRole === "super" ? "on" : ""} onClick={() => switchRole("super")} type="button">{t("Super admin")}</button>
            <button className={staffRole === "support" ? "on" : ""} onClick={() => switchRole("support")} type="button">{t("Support agent")}</button>
          </div>
        </div>
        <nav className="admin-console-nav" aria-label={t("Admin console navigation")}>
          {NAV_GROUPS.map((group) => {
            const visibleItems = group.items.filter((item) => !("superOnly" in item && item.superOnly && staffRole === "support"));
            if (!visibleItems.length) return null;
            return <div key={group.title}><span>{t(group.title)}</span>{visibleItems.map((item) => {
              const Icon = item.icon;
              const count = badgeCounts[item.section as keyof typeof badgeCounts];
              return <button className={section === item.section ? "on" : ""} key={item.section} onClick={() => openSection(item.section)} type="button"><Icon size={16} /><span>{t(item.label)}</span>{count ? <em>{count}</em> : null}</button>;
            })}</div>;
          })}
        </nav>
        <div className="admin-console-user">
          <div className="admin-console-user-identity">
            <i>{getInitials(user?.name ?? "Staff")}</i>
            <span><strong>{user?.name ?? t("Staff")}</strong><small>{t(staffRole === "super" ? "Super admin" : "Support agent")}</small></span>
          </div>
          <button className="admin-console-logout" type="button" onClick={onLogout}>
            <LogOut aria-hidden="true" size={16} />
            <span>{t("Log out")}</span>
          </button>
        </div>
      </aside>

      <div className="admin-console-content admin-console-page">
        <header className="admin-console-heading">
          <div><h1>{t(meta.title)}</h1><span>{t(meta.subtitle)}</span></div>
          <aside>{staffRole === "support" ? <SupportScopePill /> : null}<span className="admin-staff-pill"><Shield aria-hidden="true" size={13} />{t("Every action is logged")}</span></aside>
        </header>

        {notice ? <div className="admin-console-notice" role="status"><Check size={17} /><span>{t(notice)}</span></div> : null}
        {verificationError ? <p className="marketplace-feedback warning">{t(verificationError)}</p> : null}

        {section === "overview" ? <AdminDashboard registrations={accounts} user={user} /> : null}
        {section === "activity" ? <AdminActivity /> : null}
        {operationTab ? <MarketSection activeTab={operationTab} onUpdateRegistration={updateRegistration} registrations={accounts} showTabs={false} staffRole={staffRole} user={user} /> : null}
        {section === "users" ? <AdminUsers onNavigate={openSection} onNotice={setNotice} onUpdateRegistration={updateRegistration} registrations={accounts} staffRole={staffRole} /> : null}
        {section === "disputes" ? <AdminDisputes onNavigate={openSection} onNotice={setNotice} /> : null}
        {section === "inbox" ? <AdminInbox chatThreads={chatThreads} onAdminReply={onAdminReply} onThreadOpen={onThreadOpen} /> : null}
        {section === "roles" && staffRole === "super" ? <AdminRoles onNotice={setNotice} /> : null}
      </div>
    </section>
  );
}
