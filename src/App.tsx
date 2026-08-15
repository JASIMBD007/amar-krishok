import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate, NavLink, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { usePageViewBeacon } from "./analytics/usePageViewBeacon";
import { MessengerPanel, type ComposeTarget } from "./components/messages/MessengerPanel";
import { fetchMyThreads } from "./api/chat";
import {
  LogOut,
  Menu,
  MessageCircle,
  Shield,
  X,
} from "lucide-react";
import {
  ApiRequestError,
  fetchMyProfile,
  fetchMyCropLots,
  fetchMyOrders,
  fetchNotifications,
  fetchPublicCropLots,
  fetchUploadObjectUrl,
  isOwnUploadUrl,
  markAllNotificationsRead,
  markNotificationRead,
  type BackendCropLot,
  type BackendOrder,
} from "./api/auth";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { LaunchNoticeModal } from "./components/LaunchNoticeModal";
import { BrandMark } from "./components/BrandMark";
import { Seo } from "./components/Seo";
import { SiteFooter } from "./components/SiteFooter";
import { CookieConsentBanner } from "./components/CookieConsentBanner";
import { FloatingSupportChat } from "./components/chat/FloatingSupportChat";
import { RateTicker } from "./components/market/RateTicker";
import { NotificationCenter } from "./components/notifications/NotificationCenter";
import { NotificationDetailDialog } from "./components/notifications/NotificationDetailDialog";
import { makeRoleNotifications, mergeNotifications, toAppNotification } from "./components/notifications/roleNotifications";
import { LanguageContext, translate } from "./i18n";
import { lots, routeByView, serviceDistricts } from "./data";
import {
  AdminPage,
  CheckoutPage,
  EditListingPage,
  FarmerDeskPage,
  HomePage,
  LotDetailPage,
  LoginPage,
  MarketplacePage,
  MyOrdersPage,
  OrderPage,
  OrderPlacedPage,
  OrderTrackingPage,
  PostCropPage,
  PricesPage,
  ProfilePage,
  RegisterPage,
  SignedOutPage,
} from "./components/pages";
import { useAppStore } from "./store/useAppStore";
import type { AppNotification, AuthUser, CropLot, RegisteredAccount, View } from "./types";
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

function HeaderNavLink({
  children,
  className,
  currentPath,
  currentSearch,
  onClick,
  to,
}: {
  children: ReactNode;
  className?: string;
  currentPath: string;
  currentSearch: string;
  onClick: () => void;
  to: string;
}) {
  if (to.startsWith("/login?")) {
    const intendedPath = new URLSearchParams(to.slice(to.indexOf("?") + 1)).get("next");
    const currentIntent = new URLSearchParams(currentSearch).get("next");
    const isCurrent = currentPath === "/login" && intendedPath === currentIntent;
    const classes = [className, isCurrent ? "active" : ""].filter(Boolean).join(" ");

    return (
      <Link aria-current={isCurrent ? "page" : undefined} className={classes || undefined} to={to} onClick={onClick}>
        {children}
      </Link>
    );
  }

  return (
    <NavLink className={className} to={to} onClick={onClick}>
      {children}
    </NavLink>
  );
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
    farmerId: lot.farmer.id,
    farmerPhone: lot.farmer.phone,
    farmerStatus: lot.farmer.status,
    farmer: lot.farmer.name,
    grade: lot.grade.replace(/^Grade\s+/i, ""),
    harvest: formatBackendHarvestDate(lot.harvestDate),
    hasFarmPhotos: Boolean(lot.imageUrl),
    id: lot.id,
    image: lot.imageUrl || staticLot?.image || "/assets/crops/rice.png",
    postedAt: lot.createdAt,
    pricePerKg: numericBackendValue(lot.pricePerKg),
    quantity: formatBackendQuantity(lot.quantityKg),
    quantityKg: numericBackendValue(lot.quantityKg),
    pickupWithin24h: Boolean(lot.pickupWithin24h),
    status: lot.status,
    transportIncluded: Boolean(lot.transportIncluded),
    upazilla: lot.upazilla ?? lot.farmer.upazilla ?? staticLot?.upazilla,
  };
}

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const sessionExpiryHandled = useRef(false);
  const {
    addRegistration,
    chatThreads,
    clearSession,
    closeHeaderMenus,
    district,
    language,
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
    toggleMenuOpen,
    updateRegistrationStatus,
    user,
  } = useAppStore();
  usePageViewBeacon(user);
  const t = useCallback((text: string) => translate(language, text), [language]);

  // The badge has to be right before the panel is ever opened, so the count is polled on its own.
  // A minute is slow enough to be free and fast enough that a reply does not sit unnoticed.
  useEffect(() => {
    const accessToken = user?.accessToken;
    if (!accessToken) {
      setUnreadMessages(0);
      return;
    }

    let active = true;
    const isStaff = user.role === "admin";
    const count = () =>
      fetchMyThreads(accessToken, isStaff)
        .then((threads) => {
          if (active) {
            setUnreadMessages(threads.reduce((total, thread) => total + thread.unread, 0));
          }
        })
        .catch(() => {
          // An unreachable backend should not put an error in the header.
        });

    void count();
    const timer = window.setInterval(count, 60_000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [user?.accessToken, user?.role]);
  const [backendNotifications, setBackendNotifications] = useState<AppNotification[] | null>(null);
  const [notificationOrders, setNotificationOrders] = useState<BackendOrder[]>([]);
  const [notificationLots, setNotificationLots] = useState<BackendCropLot[]>([]);
  const [notificationPanelOpen, setNotificationPanelOpen] = useState(false);
  const [messengerOpen, setMessengerOpen] = useState(false);
  const [messengerFocusId, setMessengerFocusId] = useState<string | null>(null);
  const [composeTarget, setComposeTarget] = useState<ComposeTarget | null>(null);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [notificationError, setNotificationError] = useState("");
  const [headerAvatarObjectUrl, setHeaderAvatarObjectUrl] = useState("");
  const [marketplaceError, setMarketplaceError] = useState("");
  const [marketplaceLots, setMarketplaceLots] = useState<CropLot[]>([]);
  const [marketplaceLoading, setMarketplaceLoading] = useState(false);
  const [launchNoticeOpen, setLaunchNoticeOpen] = useState(false);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const [reviewedNotificationIds, setReviewedNotificationIds] = useState<string[]>([]);
  const [selectedNotification, setSelectedNotification] = useState<AppNotification | null>(null);

  // Older persisted sessions predate avatarUrl on AuthUser. Refresh the current profile once so the
  // header can show an existing photo immediately, without requiring the person to upload it again.
  useEffect(() => {
    const accessToken = user?.accessToken;
    const accountId = user?.accountId;
    const role = user?.role;
    if (!accessToken || !accountId || role === "admin") {
      return;
    }

    let active = true;
    fetchMyProfile(accessToken)
      .then((account) => {
        if (!active) return;
        const current = useAppStore.getState().user;
        if (!current || current.accountId !== account.id) return;

        const nextAvatarUrl = account.avatarUrl || "";
        if (
          current.avatarUrl === nextAvatarUrl
          && current.name === account.name
          && current.district === account.district
        ) {
          return;
        }
        setUser({
          ...current,
          avatarUrl: nextAvatarUrl,
          district: account.district,
          name: account.name,
          phone: account.phone,
          username: account.username,
        });
      })
      .catch(() => {
        // Other protected requests handle expired sessions; the header safely falls back to initials.
      });

    return () => {
      active = false;
    };
  }, [setUser, user?.accessToken, user?.accountId, user?.role]);

  // Private profile uploads require the bearer token, so resolve them to a short-lived browser URL.
  useEffect(() => {
    const accessToken = user?.accessToken;
    const avatarUrl = user?.avatarUrl ?? "";
    if (!accessToken || !isOwnUploadUrl(avatarUrl)) {
      setHeaderAvatarObjectUrl("");
      return;
    }

    let active = true;
    let objectUrl = "";
    fetchUploadObjectUrl(accessToken, avatarUrl)
      .then(({ url }) => {
        objectUrl = url;
        if (active) setHeaderAvatarObjectUrl(url);
      })
      .catch(() => {
        if (active) setHeaderAvatarObjectUrl("");
      });

    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [user?.accessToken, user?.avatarUrl]);

  const handleProtectedRequestError = useCallback(
    (error: unknown) => {
      if (!(error instanceof ApiRequestError) || error.status !== 401) {
        return false;
      }

      if (sessionExpiryHandled.current) {
        return true;
      }

      sessionExpiryHandled.current = true;
      setUser(null);
      setNotificationPanelOpen(false);
      setNotificationError("");
      navigate(`/login?next=${encodeURIComponent(location.pathname)}`, { replace: true });
      return true;
    },
    [location.pathname, navigate, setUser],
  );

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
  }, [registrations, setUser, user]);

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
  }, [district, marketplaceLots, query, t]);

  useEffect(() => {
    if (!user?.accessToken) {
      sessionExpiryHandled.current = false;
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
        if (handleProtectedRequestError(error)) return;
        setBackendNotifications(null);
        setNotificationError(error instanceof ApiRequestError ? error.message : "Backend service is unavailable. Please try again.");
      });

    if (user.role === "buyer" || user.role === "admin") {
      fetchMyOrders(accessToken)
        .then((orders) => setNotificationOrders(orders))
        .catch((error) => {
          if (handleProtectedRequestError(error)) return;
          setNotificationOrders([]);
        });
    } else {
      setNotificationOrders([]);
    }

    if (user.role === "farmer" || user.role === "admin") {
      fetchMyCropLots(accessToken)
        .then((cropLots) => setNotificationLots(cropLots))
        .catch((error) => {
          if (handleProtectedRequestError(error)) return;
          setNotificationLots([]);
        });
    } else {
      setNotificationLots([]);
    }
  }, [handleProtectedRequestError, user]);

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

  const handleMarketplaceEditLot = (lot: CropLot) => {
    navigate(`/farmer/listings/${encodeURIComponent(lot.id)}`);
  };

  const openHeaderRegisterChoice = () => {
    closeAllHeaderMenus();
    navigate("/register/farmer");
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
          if (handleProtectedRequestError(error)) return;
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
      if (handleProtectedRequestError(error)) return;
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
      setUser({
        ...user,
        avatarUrl: account.avatarUrl,
        district: account.district,
        name: account.name,
        phone: account.phone,
        username: account.username,
      });
    }
  };

  const completeLogout = () => {
    clearSession();
    closeAllHeaderMenus();
    setLogoutConfirmOpen(false);
    setSelectedNotification(null);
    // Signing out always lands on the confirmation, which says escrow keeps running regardless.
    navigate("/signed-out");
  };

  const requestLogout = () => {
    closeAllHeaderMenus();
    setLogoutConfirmOpen(true);
  };

  // Orders whose escrow balance is still held, so the logout warning can name a real number.
  const heldOrderCount = notificationOrders.filter((order) =>
    (order.payments ?? []).some((payment) => payment.status === "HELD"),
  ).length;

  const currentRegistration = user
    ? registrations.find(
        (account) => account.id === user.accountId || (account.phone === user.phone && account.role === user.role),
      )
    : undefined;
  const accountDistrict = user?.district || currentRegistration?.district || "";
  // Was an anchor into the buyer workspace and the farmer desk. The farmer desk lost its
  // profile panel when it was rebuilt, so that link went nowhere. Both roles get a real page.
  const participantProfilePath = "/profile";
  const participantRoleLabel = user?.role === "buyer" ? "Buyer" : "Seller";
  const accountInitials = user
    ? user.name
        .replace(/^(Md\.|Mst\.|Mrs\.|Mr\.)\s*/i, "")
        .split(/\s+/)
        .filter(Boolean)
        .map((word) => word[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "";

  // The former "Admin" tab becomes a role-aware "Dashboard" link that sends each
  // signed-in user to their own workspace (farmer/buyer/admin), or to login otherwise.
  // The demo's nav: the logo goes home, so the bar itself carries only the five destinations.
  // Staff enter the console through their account chip; the public nav stays focused on public destinations.
  const navItems: Array<{ id: string; label: string; path: string; count?: number; staff?: boolean }> = [
    { id: "market", label: "Marketplace", path: "/marketplace" },
    { id: "prices", label: "Market rates", path: "/prices" },
    { id: "farmer", label: "Farmer desk", path: user ? "/farmer" : "/login?next=%2Ffarmer" },
    {
      id: "orders",
      label: "My orders",
      path: user ? "/orders" : "/login?next=%2Forders",
    },
  ];

  return (
    <LanguageContext.Provider value={language}>
    <Seo language={language} pathname={location.pathname} />
    <div className="app-shell" lang={language}>
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
          <BrandMark className="brand-mark" />
          <strong>AmarKrishok</strong>
        </NavLink>

        <nav className="main-nav" aria-label={t("Main navigation")}>
          {navItems.map((item) => (
            <HeaderNavLink
              className={item.staff ? "nav-staff" : undefined}
              currentPath={location.pathname}
              currentSearch={location.search}
              key={item.id}
              to={item.path}
              onClick={closeAllHeaderMenus}
            >
              <span className="nav-label">
                {item.staff ? <Shield aria-hidden="true" size={15} /> : null}
                {t(item.label)}
                {item.count === undefined ? null : <span className="nav-count">{t(String(item.count))}</span>}
              </span>
            </HeaderNavLink>
          ))}
        </nav>

        <div className="header-actions">
          <button
            className="language-toggle"
            type="button"
            aria-label={t("Language switch")}
            onClick={() => setLanguage(language === "en" ? "bn-BD" : "en")}
          >
            EN <span aria-hidden="true">·</span> <span className="bn-glyph">বাংলা</span>
          </button>
          {user ? (
            <NotificationCenter
              emptyLabel="No notifications right now"
              notifications={activeNotifications}
              onMarkAllReviewed={markAllNotificationsReviewed}
              onOpenNotification={openNotification}
              onToggle={() => {
                closeHeaderMenus();
                setNotificationPanelOpen((value) => !value);
              }}
              open={notificationPanelOpen}
              reviewedIds={reviewedNotificationIds}
            />
          ) : null}
          {/* Messages sit beside notifications: both are "something is waiting for you". */}
          {user ? (
            <div className="header-messages">
              <button
                aria-expanded={messengerOpen}
                aria-label={t("Messages")}
                className="icon-button header-icon-button"
                type="button"
                onClick={() => {
                  closeHeaderMenus();
                  setNotificationPanelOpen(false);
                  setMessengerFocusId(null);
                  setComposeTarget(null);
                  setMessengerOpen((value) => !value);
                }}
              >
                <MessageCircle aria-hidden="true" size={20} />
                {unreadMessages > 0 ? <em className="header-badge">{unreadMessages > 9 ? "9+" : unreadMessages}</em> : null}
              </button>
              {messengerOpen ? (
                <MessengerPanel
                  composeWith={composeTarget}
                  focusThreadId={messengerFocusId}
                  locale={language}
                  onClose={() => setMessengerOpen(false)}
                  onUnreadChange={setUnreadMessages}
                  user={user}
                />
              ) : null}
            </div>
          ) : null}
          {/* Signed out, the demo shows the two calls to action directly rather than a menu. */}
          {!user ? (
            <span className="header-auth">
              <NavLink className="text-link" to="/login" onClick={closeAllHeaderMenus}>
                {t("Log in")}
              </NavLink>
              <button className="primary-button danger-button" type="button" onClick={openHeaderRegisterChoice}>
                {t("Sign up free")}
              </button>
            </span>
          ) : null}
          {user && user.role !== "admin" ? (
            <div className="participant-account">
              <NavLink
                aria-label={t("Open profile")}
                className="participant-profile"
                to={participantProfilePath}
                onClick={closeAllHeaderMenus}
              >
                <span className={`participant-profile-initials${headerAvatarObjectUrl ? " has-photo" : ""}`} aria-hidden="true">
                  {headerAvatarObjectUrl ? <img alt="" src={headerAvatarObjectUrl} /> : accountInitials}
                </span>
                <span className="participant-profile-copy">
                  <strong>{user.name}</strong>
                  <small>
                    {t(participantRoleLabel)}
                    {accountDistrict ? ` · ${t(accountDistrict)}` : ""}
                  </small>
                </span>
              </NavLink>
              <button className="secondary-button participant-logout-button" type="button" onClick={requestLogout}>
                <LogOut aria-hidden="true" size={17} />
                <span>{t("Log out")}</span>
              </button>
            </div>
          ) : null}
          {user?.role === "admin" ? (
            <div className="admin-header-account">
              <NavLink
                aria-label={t("Open admin profile")}
                className="admin-header-profile"
                to="/admin/users"
                onClick={closeAllHeaderMenus}
              >
                <span className="account-chip-initials" aria-hidden="true">
                  {accountInitials}
                </span>
                <span className="account-chip-copy">
                  <strong>{user.name}</strong>
                  <small>{t("Operations")} · {accountDistrict ? `${t(accountDistrict)} HQ` : t("Dhaka HQ")}</small>
                </span>
              </NavLink>
            </div>
          ) : null}
        </div>

        {menuOpen && (
          <nav className="mobile-menu-panel" aria-label={t("Mobile navigation")}>
            <div className="mobile-menu-links">
              {navItems.map((item) => (
                <HeaderNavLink
                  className={item.staff ? "nav-staff" : undefined}
                  currentPath={location.pathname}
                  currentSearch={location.search}
                  key={item.id}
                  to={item.path}
                  onClick={closeAllHeaderMenus}
                >
                  {t(item.label)}
                  {item.count === undefined ? null : <span className="nav-count">{t(String(item.count))}</span>}
                </HeaderNavLink>
              ))}
            </div>
            <div className="mobile-menu-actions">
              <button
                className="language-toggle"
                type="button"
                aria-label={t("Language switch")}
                onClick={() => setLanguage(language === "en" ? "bn-BD" : "en")}
              >
                EN <span aria-hidden="true">·</span> <span className="bn-glyph">বাংলা</span>
              </button>
              {!user ? (
                <>
                  <NavLink className="mobile-menu-action-link" to="/login" onClick={closeAllHeaderMenus}>{t("Log in")}</NavLink>
                  <button className="mobile-menu-signup" type="button" onClick={openHeaderRegisterChoice}>{t("Sign up free")}</button>
                </>
              ) : null}
              {user?.role === "admin" ? (
                <>
                  <NavLink className="mobile-menu-action-link" to="/admin/users" onClick={closeAllHeaderMenus}>
                    <span className="mobile-menu-avatar" aria-hidden="true">{accountInitials}</span>
                    <span>{user.name}</span>
                  </NavLink>
                  <button className="mobile-menu-action-link" type="button" onClick={requestLogout}><LogOut aria-hidden="true" size={17} />{t("Log out")}</button>
                </>
              ) : null}
              {user && user.role !== "admin" ? (
                <>
                  <NavLink className="mobile-menu-action-link" to={participantProfilePath} onClick={closeAllHeaderMenus}>
                    <span className={`mobile-menu-avatar${headerAvatarObjectUrl ? " has-photo" : ""}`} aria-hidden="true">
                      {headerAvatarObjectUrl ? <img alt="" src={headerAvatarObjectUrl} /> : accountInitials}
                    </span>
                    <span>{t("Profile")}</span>
                  </NavLink>
                  <button className="mobile-menu-action-link" type="button" onClick={requestLogout}><LogOut aria-hidden="true" size={17} />{t("Log out")}</button>
                </>
              ) : null}
            </div>
          </nav>
        )}
      </header>
      <RateTicker />
      {launchNoticeOpen && <LaunchNoticeModal onClose={() => setLaunchNoticeOpen(false)} />}
      {selectedNotification && (
        <NotificationDetailDialog notification={selectedNotification} onClose={() => setSelectedNotification(null)} />
      )}

      <main className="app-content">
        <Routes location={location}>
        <Route path="/" element={<HomePage lots={marketplaceLots} setView={selectView} />} />
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
              currentUser={user}
              onEditLot={handleMarketplaceEditLot}
            />
          }
        />
        <Route path="/lot/:lotId" element={<LotDetailPage lots={marketplaceLots} user={user} />} />
        <Route
          path="/checkout/:lotId"
          element={
            <ProtectedRoute allowedRoles={["admin", "buyer", "farmer"]} user={user} t={t}>
              <CheckoutPage lots={marketplaceLots} user={user} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/orders"
          element={
            <ProtectedRoute allowedRoles={["admin", "buyer", "farmer"]} user={user} t={t}>
              <MyOrdersPage user={user} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/orders/:orderId/placed"
          element={
            <ProtectedRoute allowedRoles={["admin", "buyer", "farmer"]} user={user} t={t}>
              <OrderPlacedPage user={user} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/orders/:orderId"
          element={
            <ProtectedRoute allowedRoles={["admin", "buyer", "farmer"]} user={user} t={t}>
              <OrderTrackingPage user={user} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/farmer"
          element={
            <ProtectedRoute allowedRoles={["farmer", "admin"]} user={user} t={t}>
              <FarmerDeskPage user={user} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/farmer/listings/:lotId"
          element={
            <ProtectedRoute allowedRoles={["farmer", "admin"]} user={user} t={t}>
              <EditListingPage user={user} />
            </ProtectedRoute>
          }
        />
        {/* Posting, editing and the profile panel keep their own route, as the v2 IA has them. */}
        <Route
          path="/farmer/post"
          element={
            <ProtectedRoute allowedRoles={["farmer", "admin"]} user={user} t={t}>
              <PostCropPage user={user} />
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
          path="/admin/*"
          element={
            <ProtectedRoute allowedRoles={["admin"]} user={user} t={t}>
              <AdminPage
                onMessageUser={(target) => {
                  // Staff message from a user record; the panel finds or starts that conversation.
                  closeHeaderMenus();
                  setNotificationPanelOpen(false);
                  setMessengerFocusId(null);
                  setComposeTarget(target);
                  setMessengerOpen(true);
                }}
                chatThreads={chatThreads}
                orderCount={notificationOrders.length}
                openDisputeCount={notificationOrders.filter((order) => Boolean(order.disputeOpenedAt)).length}
                registrations={registrations}
                onAdminReply={sendAdminChatReply}
                onLogout={requestLogout}
                onThreadOpen={markChatThreadOpen}
                onUpdateRegistration={updateRegistrationStatus}
                user={user}
              />
            </ProtectedRoute>
          }
        />
        <Route path="/login" element={<LoginPage onLogin={handleLogin} user={user} />} />
        <Route path="/register" element={<Navigate to="/register/farmer" replace />} />
        <Route path="/register/buyer" element={<RegisterPage role="buyer" onRegister={handleRegister} />} />
        <Route path="/register/farmer" element={<RegisterPage role="farmer" onRegister={handleRegister} />} />
        <Route path="/signed-out" element={<SignedOutPage />} />
        <Route
          path="/profile"
          element={
            <ProtectedRoute allowedRoles={["buyer", "farmer"]} user={user} t={t}>
              <ProfilePage
                user={user}
                onProfileSaved={handleProfileSaved}
                onContactSupport={() => {
                  closeHeaderMenus();
                  setNotificationPanelOpen(false);
                  setMessengerOpen(true);
                }}
              />
            </ProtectedRoute>
          }
        />
        <Route path="/market" element={<Navigate to="/marketplace" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <SiteFooter />
      <CookieConsentBanner />
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
              {/* Escrow keeps running whether or not you are signed in — say so when money is held. */}
              {heldOrderCount > 0 ? (
                <p>
                  {t("You have")} {t(String(heldOrderCount))}{" "}
                  {t(heldOrderCount === 1 ? "order still in escrow." : "orders still in escrow.")}{" "}
                  {t("Escrow keeps running whether you are signed in or not.")}
                </p>
              ) : (
                <p>{t("You can stay signed in or log out of this device.")}</p>
              )}
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
    </div>
    </LanguageContext.Provider>
  );
}
