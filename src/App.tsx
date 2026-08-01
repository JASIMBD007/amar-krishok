import { useCallback, useEffect, useMemo, useState } from "react";
import { Navigate, NavLink, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import {
  ChevronDown,
  LogOut,
  LockKeyhole,
  Menu,
  Sprout,
  UserRound,
  X,
} from "lucide-react";
import {
  ApiRequestError,
  fetchMyCropLots,
  fetchMyOrders,
  fetchNotifications,
  fetchPublicCropLots,
  markAllNotificationsRead,
  markNotificationRead,
  type BackendCropLot,
  type BackendOrder,
} from "./api/auth";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { RegisterChoiceModal } from "./components/RegisterChoiceModal";
import { LaunchNoticeModal } from "./components/LaunchNoticeModal";
import { Seo } from "./components/Seo";
import { FloatingSupportChat } from "./components/chat/FloatingSupportChat";
import { NotificationCenter } from "./components/notifications/NotificationCenter";
import { NotificationDetailDialog } from "./components/notifications/NotificationDetailDialog";
import { makeRoleNotifications, mergeNotifications, toAppNotification } from "./components/notifications/roleNotifications";
import { roleCanOpenPath } from "./components/pages/pageHelpers";
import { LanguageContext, translate } from "./i18n";
import { lots, roleOptions, routeByView, serviceDistricts, views } from "./data";
import { AdminPage, HomePage, LoginPage, MarketplacePage, OrderPage, PostCropPage, PricesPage, RegisterPage } from "./components/pages";
import { useAppStore } from "./store/useAppStore";
import type { AppNotification, AuthUser, CropLot, RegisteredAccount, RegistrationRole, Role, View } from "./types";
import { matchesSearch } from "./utils/search";

const REVIEWED_NOTIFICATIONS_STORAGE_KEY = "amarKrishokReviewedNotifications";

function reviewedNotificationKey(user: AuthUser) {
  return `${user.role}:${user.accountId ?? user.phone}`;
}

function readStoredReviewedNotificationIds(user: AuthUser | null) {
  if (!user) {
    return [];
  }

  try {
    const savedNotifications = window.localStorage.getItem(REVIEWED_NOTIFICATIONS_STORAGE_KEY);
    const reviewedByUser = savedNotifications ? (JSON.parse(savedNotifications) as Record<string, string[]>) : {};
    return reviewedByUser[reviewedNotificationKey(user)] ?? [];
  } catch {
    return [];
  }
}

function saveStoredReviewedNotificationIds(user: AuthUser | null, ids: string[]) {
  if (!user) {
    return;
  }

  try {
    const savedNotifications = window.localStorage.getItem(REVIEWED_NOTIFICATIONS_STORAGE_KEY);
    const reviewedByUser = savedNotifications ? (JSON.parse(savedNotifications) as Record<string, string[]>) : {};
    reviewedByUser[reviewedNotificationKey(user)] = Array.from(new Set(ids)).slice(-200);
    window.localStorage.setItem(REVIEWED_NOTIFICATIONS_STORAGE_KEY, JSON.stringify(reviewedByUser));
  } catch {
    // Notification review state still works for the current session if local storage is unavailable.
  }
}

function notificationShowsDetails(notification: AppNotification) {
  return notification.title === "Farmer lot updated" || notification.title === "Farmer lot status changed";
}

function numericBackendValue(value: string | number | null | undefined) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

function formatBackendQuantity(value: string | number | null | undefined) {
  const kg = numericBackendValue(value);
  if (kg >= 1000) {
    return `${(kg / 1000).toFixed(kg % 1000 === 0 ? 0 : 1)} tons`;
  }

  return `${kg.toLocaleString("en-US")} kg`;
}

function formatBackendHarvestDate(value: string | null | undefined) {
  if (!value) {
    return "Ready today";
  }

  const harvestDate = new Date(value);
  if (Number.isNaN(harvestDate.getTime())) {
    return "Ready today";
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  harvestDate.setHours(0, 0, 0, 0);
  const daysAway = Math.round((harvestDate.getTime() - today.getTime()) / 86_400_000);

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

function toMarketplaceLot(lot: BackendCropLot): CropLot {
  const staticLot = lots.find((item) => item.crop.toLowerCase() === lot.crop.name.toLowerCase());
  return {
    ask: `৳${Math.round(numericBackendValue(lot.pricePerKg)).toLocaleString("en-US")}/kg`,
    crop: lot.crop.name,
    district: lot.district.name,
    farmer: lot.farmer.name,
    grade: lot.grade.replace(/^Grade\s+/i, ""),
    harvest: formatBackendHarvestDate(lot.harvestDate),
    id: lot.id,
    image: lot.imageUrl || staticLot?.image || "/assets/crops/rice.png",
    postedAt: lot.createdAt,
    quantity: formatBackendQuantity(lot.quantityKg),
    upazilla: lot.upazilla ?? lot.farmer.upazilla ?? staticLot?.upazilla,
  };
}

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
    markChatThreadOpen,
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
    const [marketplaceError, setMarketplaceError] = useState("");
    const [marketplaceLots, setMarketplaceLots] = useState<CropLot[]>([]);
    const [marketplaceLoading, setMarketplaceLoading] = useState(false);
    const [launchNoticeOpen, setLaunchNoticeOpen] = useState(false);
  const [registerChoiceOpen, setRegisterChoiceOpen] = useState(false);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const [reviewedNotificationIds, setReviewedNotificationIds] = useState<string[]>([]);
  const [selectedNotification, setSelectedNotification] = useState<AppNotification | null>(null);

  const closeAllHeaderMenus = () => {
    closeHeaderMenus();
    setNotificationPanelOpen(false);
    setRegisterChoiceOpen(false);
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

  const refreshMarketplaceLots = useCallback(() => {
    let isActive = true;
    setMarketplaceLoading(true);

    fetchPublicCropLots()
      .then((backendLots) => {
        if (!isActive) {
          return;
        }

        const mappedLots = backendLots.map(toMarketplaceLot);
        setMarketplaceLots(mappedLots);
        setMarketplaceError("");
      })
      .catch((error) => {
        if (!isActive) {
          return;
        }

        setMarketplaceLots([]);
        setMarketplaceError(error instanceof ApiRequestError ? error.message : "Could not load marketplace lots.");
      })
      .finally(() => {
        if (isActive) {
          setMarketplaceLoading(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => refreshMarketplaceLots(), [refreshMarketplaceLots]);

  useEffect(() => {
    if (location.pathname === "/marketplace") {
      return refreshMarketplaceLots();
    }

    return undefined;
  }, [location.pathname, refreshMarketplaceLots]);

  useEffect(() => {
    if (location.pathname !== "/") {
      setLaunchNoticeOpen(false);
      return;
    }

    try {
      if (window.sessionStorage.getItem("amarKrishokLaunchNoticeSeen") === "1") {
        return;
      }

      window.sessionStorage.setItem("amarKrishokLaunchNoticeSeen", "1");
    } catch {
      // The modal still works for the current render if session storage is unavailable.
    }

    setLaunchNoticeOpen(true);
  }, [location.pathname]);

  const marketplaceDistricts = useMemo(
    () => Array.from(new Set([...serviceDistricts, ...marketplaceLots.map((lot) => lot.district)])).sort(),
    [marketplaceLots],
  );

  const filteredLots = useMemo(() => {
    return marketplaceLots.filter((lot) => {
      const textMatch = matchesSearch(query, [
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
      ]);
      const districtMatch = district === "All districts" || lot.district === district;
      return textMatch && districtMatch;
    });
  }, [query, district, language, marketplaceLots]);

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
    setReviewedNotificationIds(readStoredReviewedNotificationIds(user));

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

    navigate(`/login?next=${encodeURIComponent(targetPath)}`);
    closeAllHeaderMenus();
  };

  const openHeaderRegisterChoice = () => {
    closeHeaderMenus();
    setNotificationPanelOpen(false);
    setRegisterChoiceOpen(true);
  };

  const chooseRegistration = (role: RegistrationRole) => {
    setRegisterChoiceOpen(false);
    navigate(role === "farmer" ? "/register/farmer" : "/register/buyer");
  };

  const openNotification = (notification: AppNotification) => {
    setReviewedNotificationIds((current) => {
      const nextIds = current.includes(notification.id) ? current : [...current, notification.id];
      saveStoredReviewedNotificationIds(user, nextIds);
      return nextIds;
    });

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

    if (notificationShowsDetails(notification)) {
      setSelectedNotification(notification);
      return;
    }

    if (notification.href) {
      navigate(notification.href);
    }
  };

  const markAllNotificationsReviewed = () => {
    setReviewedNotificationIds((current) => {
      const nextIds = Array.from(new Set([...current, ...activeNotifications.map((notification) => notification.id)]));
      saveStoredReviewedNotificationIds(user, nextIds);
      return nextIds;
    });

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
    addRegistration(account);

    if (user?.accountId === account.id) {
      setUser({ ...user, name: account.name, phone: account.phone, username: account.username });
    }
  };

  const completeLogout = () => {
    setUser(null);
    closeAllHeaderMenus();
    setLogoutConfirmOpen(false);
    setSelectedNotification(null);
    if (location.pathname === "/admin" || location.pathname === "/buyer" || location.pathname === "/farmer") {
      navigate("/");
    }
  };

  const requestLogout = () => {
    closeAllHeaderMenus();
    setLogoutConfirmOpen(true);
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
                  <span>{t("Account access")}</span>
                )}
                {user ? (
                  roleOptions.map((option) => {
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
                  })
                ) : (
                  <NavLink className="role-option" to="/login" onClick={closeAllHeaderMenus}>
                    <LockKeyhole size={18} />
                    <span>
                      <strong>{t("Sign in")}</strong>
                      <small>{t("Choose account type to sign in")}</small>
                    </span>
                  </NavLink>
                )}
                {!user && (
                  <button className="role-option" type="button" role="menuitem" onClick={openHeaderRegisterChoice}>
                    <UserRound size={18} />
                    <span>
                      <strong>{t("Register")}</strong>
                      <small>{t("Choose buyer or seller account")}</small>
                    </span>
                  </button>
                )}
                {user && (
                  <button className="role-option danger" type="button" role="menuitem" onClick={requestLogout}>
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
        {registerChoiceOpen && <RegisterChoiceModal onChoose={chooseRegistration} onClose={() => setRegisterChoiceOpen(false)} />}
        {launchNoticeOpen && <LaunchNoticeModal onClose={() => setLaunchNoticeOpen(false)} />}
        {selectedNotification && (
          <NotificationDetailDialog notification={selectedNotification} onClose={() => setSelectedNotification(null)} />
        )}

      <Routes location={location}>
        <Route path="/" element={<HomePage setView={selectView} />} />
        <Route
          path="/marketplace"
          element={
            <MarketplacePage
              district={district}
              districtOptions={marketplaceDistricts}
              error={marketplaceError}
              filteredLots={filteredLots}
              isLoading={marketplaceLoading}
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
                onThreadOpen={markChatThreadOpen}
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
      {logoutConfirmOpen && (
        <div
          className="admin-modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setLogoutConfirmOpen(false);
            }
          }}
        >
          <section className="admin-modal confirm-modal" role="dialog" aria-modal="true" aria-labelledby="logout-confirm-title">
            <div className="admin-modal-header">
              <div>
                <span>{t("Account session")}</span>
                <h2 id="logout-confirm-title">{t("Log out?")}</h2>
              </div>
              <button className="icon-button" type="button" aria-label={t("Close modal")} onClick={() => setLogoutConfirmOpen(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="confirm-modal-body">
              <LogOut size={22} />
              <strong>{t("Do you want to log out?")}</strong>
              <p>{t("You can stay signed in or log out of this device.")}</p>
            </div>
            <div className="confirm-modal-actions">
              <button className="secondary-button" type="button" onClick={() => setLogoutConfirmOpen(false)}>
                {t("Stay logged in")}
              </button>
              <button className="primary-button danger-button" type="button" onClick={completeLogout}>
                {t("Log out")}
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
    </LanguageContext.Provider>
  );
}
