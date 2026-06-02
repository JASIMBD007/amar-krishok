import { useEffect, useMemo, useState } from "react";
import { Navigate, NavLink, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import {
  ChevronDown,
  LockKeyhole,
  Menu,
  ShoppingBag,
  Sprout,
  X,
} from "lucide-react";
import {
  ApiRequestError,
  fetchMyCropLots,
  fetchMyOrders,
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type BackendCropLot,
  type BackendOrder,
} from "./api/auth";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { Seo } from "./components/Seo";
import { FloatingSupportChat } from "./components/chat/FloatingSupportChat";
import { NotificationCenter } from "./components/notifications/NotificationCenter";
import { makeRoleNotifications, mergeNotifications, toAppNotification } from "./components/notifications/roleNotifications";
import { roleCanOpenPath } from "./components/pages/pageHelpers";
import { LanguageContext, translate } from "./i18n";
import { lots, roleOptions, routeByView, views } from "./data";
import { AdminPage, HomePage, LoginPage, MarketplacePage, OrderPage, PostCropPage, PricesPage, RegisterPage } from "./components/pages";
import { useAppStore } from "./store/useAppStore";
import type { AppNotification, AuthUser, RegisteredAccount, Role, View } from "./types";

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    addRegistration,
    chatThreads,
    closeHeaderMenus,
    district,
    language,
    loginOpen,
    menuOpen,
    query,
    registrations,
    sendAdminChatReply,
    sendParticipantChatMessage,
    sendUserChatMessage,
    setDistrict,
    setLanguage,
    setQuery,
    setUser,
    toggleLoginOpen,
    toggleMenuOpen,
    updateRegistrationStatus,
    user,
  } = useAppStore();
  const t = (text: string) => translate(language, text);
  const [backendNotifications, setBackendNotifications] = useState<AppNotification[] | null>(null);
  const [notificationOrders, setNotificationOrders] = useState<BackendOrder[]>([]);
  const [notificationLots, setNotificationLots] = useState<BackendCropLot[]>([]);
  const [notificationPanelOpen, setNotificationPanelOpen] = useState(false);
  const [notificationError, setNotificationError] = useState("");
  const [reviewedNotificationIds, setReviewedNotificationIds] = useState<string[]>([]);

  const closeAllHeaderMenus = () => {
    closeHeaderMenus();
    setNotificationPanelOpen(false);
  };

  useEffect(() => {
    if (user?.role === "admin" && !user.accessToken) {
      setUser(null);
      return;
    }

    if (!user || user.role === "admin") {
      return;
    }

    if (user.accessToken) {
      return;
    }

    const account = registrations.find((item) => item.id === user.accountId);
    if (!account || account.status !== "active") {
      setUser(null);
    }
  }, [registrations, user]);

  const filteredLots = useMemo(() => {
    return lots.filter((lot) => {
      const haystack = `${lot.crop} ${lot.farmer} ${lot.district} ${t(lot.crop)} ${t(lot.farmer)} ${t(lot.district)}`;
      const textMatch = haystack.toLowerCase().includes(query.toLowerCase());
      const districtMatch = district === "All districts" || lot.district === district;
      return textMatch && districtMatch;
    });
  }, [query, district, language]);

  useEffect(() => {
    if (!user?.accessToken) {
      setBackendNotifications(null);
      setNotificationOrders([]);
      setNotificationLots([]);
      setNotificationError("");
      setNotificationPanelOpen(false);
      return;
    }

    const accessToken = user.accessToken;
    setReviewedNotificationIds([]);

    fetchNotifications(accessToken)
      .then((notifications) => {
        setBackendNotifications(notifications.map((notification) => toAppNotification(notification, user.role)));
        setNotificationError("");
      })
      .catch((error) => {
        setBackendNotifications(null);
        setNotificationError(error instanceof ApiRequestError ? error.message : "Backend service is unavailable. Please try again.");
      });

    if (user.role === "buyer" || user.role === "admin") {
      fetchMyOrders(accessToken)
        .then((orders) => setNotificationOrders(orders))
        .catch(() => setNotificationOrders([]));
    } else {
      setNotificationOrders([]);
    }

    if (user.role === "farmer" || user.role === "admin") {
      fetchMyCropLots(accessToken)
        .then((cropLots) => setNotificationLots(cropLots))
        .catch(() => setNotificationLots([]));
    } else {
      setNotificationLots([]);
    }
  }, [user?.accessToken, user?.role]);

  const fallbackNotifications = useMemo(
    () =>
      makeRoleNotifications({
        chatThreads,
        lots: notificationLots,
        notificationError,
        orders: notificationOrders,
        registrations,
        user,
      }),
    [chatThreads, notificationError, notificationLots, notificationOrders, registrations, user],
  );
  const activeNotifications = useMemo(
    () => mergeNotifications(backendNotifications, fallbackNotifications),
    [backendNotifications, fallbackNotifications],
  );

  const selectView = (nextView: View) => {
    navigate(routeByView[nextView]);
    closeAllHeaderMenus();
  };

  const chooseRole = (role: Role, targetView: View) => {
    const targetPath = routeByView[targetView];
    if (user && roleCanOpenPath(user.role, targetPath)) {
      navigate(targetPath);
      closeAllHeaderMenus();
      return;
    }

    navigate(`/login?role=${role}&next=${encodeURIComponent(targetPath)}`);
    closeAllHeaderMenus();
  };

  const openNotification = (notification: AppNotification) => {
    setReviewedNotificationIds((current) => (current.includes(notification.id) ? current : [...current, notification.id]));

    if (user?.accessToken && backendNotifications?.some((item) => item.id === notification.id) && !notification.readAt) {
      const optimisticReadAt = new Date().toISOString();
      setBackendNotifications((current) =>
        current?.map((item) => (item.id === notification.id ? { ...item, readAt: optimisticReadAt } : item)) ?? current,
      );
      markNotificationRead(user.accessToken, notification.id)
        .then((updatedNotification) => {
          setBackendNotifications((current) =>
            current?.map((item) => (item.id === notification.id ? toAppNotification(updatedNotification, user.role) : item)) ?? current,
          );
          setNotificationError("");
        })
        .catch((error) => {
          setNotificationError(error instanceof ApiRequestError ? error.message : "Backend service is unavailable. Please try again.");
        });
    }

    setNotificationPanelOpen(false);
    closeAllHeaderMenus();

    if (notification.href) {
      navigate(notification.href);
    }
  };

  const markAllNotificationsReviewed = () => {
    setReviewedNotificationIds((current) => Array.from(new Set([...current, ...activeNotifications.map((notification) => notification.id)])));

    if (!user?.accessToken || !backendNotifications) {
      return;
    }

    const optimisticReadAt = new Date().toISOString();
    setBackendNotifications((current) => current?.map((notification) => ({ ...notification, readAt: notification.readAt ?? optimisticReadAt })) ?? current);
    markAllNotificationsRead(user.accessToken).catch((error) => {
      setNotificationError(error instanceof ApiRequestError ? error.message : "Backend service is unavailable. Please try again.");
    });
  };

  const handleLogin = (nextUser: AuthUser, nextPath: string) => {
    setUser(nextUser);
    navigate(nextPath);
    closeAllHeaderMenus();
  };

  const handleRegister = addRegistration;

  const handleProfileSaved = (account: RegisteredAccount) => {
    if (!user || user.accountId !== account.id) {
      return;
    }

    setUser({ ...user, name: account.name });
  };

  const handleLogout = () => {
    setUser(null);
    closeAllHeaderMenus();
    if (location.pathname === "/admin" || location.pathname === "/buyer" || location.pathname === "/farmer") {
      navigate("/");
    }
  };

  const roleLabel = user ? roleOptions.find((item) => item.role === user.role)?.label : null;

  return (
    <LanguageContext.Provider value={language}>
    <Seo language={language} pathname={location.pathname} />
    <main className="app-shell" lang={language === "bn" ? "bn" : "en"}>
      <header className="site-header">
        <button
          className="icon-button mobile-only"
          type="button"
          aria-expanded={menuOpen}
          aria-label={menuOpen ? t("Close menu") : t("Open menu")}
          onClick={() => {
            setNotificationPanelOpen(false);
            toggleMenuOpen();
          }}
        >
          {menuOpen ? <X size={21} /> : <Menu size={21} />}
        </button>
        <NavLink className="brand" to="/" onClick={closeAllHeaderMenus} aria-label={t("AmarKrishok home")} end>
          <span className="brand-mark">
            <Sprout size={22} strokeWidth={2.6} />
          </span>
          <span>
            <strong>AmarKrishok</strong>
            <small>{t("Direct from Farmer, Fair for All")}</small>
          </span>
        </NavLink>

        <nav className="main-nav" aria-label={t("Main navigation")}>
          {views.map((item) => (
            <NavLink end={item.path === "/"} key={item.id} to={item.path} onClick={closeAllHeaderMenus}>
              {t(item.label)}
            </NavLink>
          ))}
        </nav>

        <div className="header-actions">
          <div className="language-switch" aria-label={t("Language switch")}>
            <button className={language === "en" ? "active" : ""} type="button" onClick={() => setLanguage("en")}>
              EN
            </button>
            <button className={language === "bn" ? "active" : ""} type="button" onClick={() => setLanguage("bn")}>
              বাংলা
            </button>
          </div>
          <NotificationCenter
            emptyLabel={user ? "No notifications right now" : "Sign in to see notifications"}
            notifications={user ? activeNotifications : []}
            onMarkAllReviewed={markAllNotificationsReviewed}
            onOpenNotification={openNotification}
            onToggle={() => {
              closeHeaderMenus();
              setNotificationPanelOpen((value) => !value);
            }}
            open={notificationPanelOpen}
            reviewedIds={reviewedNotificationIds}
          />
          <div className="login-shell">
            <button
              className="secondary-button"
              type="button"
              aria-expanded={loginOpen}
              aria-haspopup="menu"
              onClick={() => {
                setNotificationPanelOpen(false);
                toggleLoginOpen();
              }}
            >
              <LockKeyhole size={17} />
              {roleLabel ? t(roleLabel) : t("Login")}
              <ChevronDown size={15} />
            </button>
            {loginOpen && (
              <div className="login-menu" role="menu">
                {user ? (
                  <div className="signed-in-note">
                    <span>{t("Signed in as")}</span>
                    <strong>{user.name}</strong>
                  </div>
                ) : (
                  <span>{t("Choose login type")}</span>
                )}
                {roleOptions.map((option) => {
                  const Icon = option.icon;
                  return (
                    <button className="role-option" key={option.role} type="button" role="menuitem" onClick={() => chooseRole(option.role, option.view)}>
                      <Icon size={18} />
                      <span>
                        <strong>{t(option.label)}</strong>
                        <small>{t(option.detail)}</small>
                      </span>
                    </button>
                  );
                })}
                {!user && (
                  <>
                    <NavLink className="role-option" to="/register/buyer" onClick={closeAllHeaderMenus}>
                      <ShoppingBag size={18} />
                      <span>
                        <strong>{t("Register buyer")}</strong>
                        <small>{t("New buyer account")}</small>
                      </span>
                    </NavLink>
                    <NavLink className="role-option" to="/register/farmer" onClick={closeAllHeaderMenus}>
                      <Sprout size={18} />
                      <span>
                        <strong>{t("Register seller")}</strong>
                        <small>{t("New seller account")}</small>
                      </span>
                    </NavLink>
                  </>
                )}
                {user && (
                  <button className="role-option danger" type="button" role="menuitem" onClick={handleLogout}>
                    <X size={18} />
                    <span>
                      <strong>{t("Logout")}</strong>
                      <small>{t("Switch account")}</small>
                    </span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {menuOpen && (
          <nav className="mobile-menu-panel" aria-label={t("Mobile navigation")}>
            {views.map((item) => (
              <NavLink end={item.path === "/"} key={item.id} to={item.path} onClick={closeAllHeaderMenus}>
                {t(item.label)}
              </NavLink>
            ))}
          </nav>
        )}
      </header>

      <Routes location={location}>
        <Route path="/" element={<HomePage setView={selectView} />} />
        <Route
          path="/marketplace"
          element={
            <MarketplacePage
              district={district}
              filteredLots={filteredLots}
              query={query}
              setDistrict={setDistrict}
              setQuery={setQuery}
              setView={selectView}
            />
          }
        />
        <Route
          path="/farmer"
          element={
            <ProtectedRoute allowedRoles={["farmer", "admin"]} user={user} t={t}>
              <PostCropPage user={user} onProfileSaved={handleProfileSaved} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/buyer"
          element={
            <ProtectedRoute allowedRoles={["buyer", "admin"]} user={user} t={t}>
              <OrderPage chatThreads={chatThreads} user={user} onProfileSaved={handleProfileSaved} onSendChatMessage={sendUserChatMessage} />
            </ProtectedRoute>
          }
        />
        <Route path="/prices" element={<PricesPage />} />
        <Route
          path="/admin"
          element={
            <ProtectedRoute allowedRoles={["admin"]} user={user} t={t}>
              <AdminPage
                chatThreads={chatThreads}
                registrations={registrations}
                onAdminReply={sendAdminChatReply}
                onUpdateRegistration={updateRegistrationStatus}
                user={user}
              />
            </ProtectedRoute>
          }
        />
        <Route path="/login" element={<LoginPage onLogin={handleLogin} user={user} />} />
        <Route path="/register" element={<Navigate to="/register/buyer" replace />} />
        <Route path="/register/buyer" element={<RegisterPage role="buyer" onRegister={handleRegister} />} />
        <Route path="/register/farmer" element={<RegisterPage role="farmer" onRegister={handleRegister} />} />
        <Route path="/market" element={<Navigate to="/marketplace" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <FloatingSupportChat chatThreads={chatThreads} user={user} onSendMessage={sendParticipantChatMessage} />
    </main>
    </LanguageContext.Provider>
  );
}
