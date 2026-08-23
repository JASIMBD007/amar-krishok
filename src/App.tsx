import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate, NavLink, Route, Routes, useLocation, useNavigate, useParams } from "react-router-dom";
import { Box, Button, Dialog, IconButton, Typography } from "@mui/material";
import { usePageViewBeacon } from "./analytics/usePageViewBeacon";
import { fetchMyThreads } from "./api/chat";
import {
  Bell,
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
  markNotificationUnread,
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
import { NotificationDetailDialog } from "./components/notifications/NotificationDetailDialog";
import { makeRoleNotifications, mergeNotifications, toAppNotification } from "./components/notifications/roleNotifications";
import { LanguageContext, translate } from "./i18n";
import { lots, roleHomePath, routeByView, serviceDistricts } from "./data";
import {
  AdminPage,
  BuyerDashboardPage,
  CheckoutPage,
  EditListingPage,
  FarmerDashboardPage,
  HomePage,
  LotDetailPage,
  LoginPage,
  MarketplacePage,
  MessagesPage,
  NotificationsPage,
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

/** The listing editor moved from /farmer/listings/:id to /desk/listings/:id; old links still land. */
function FarmerListingRedirect() {
  const { lotId } = useParams();
  return <Navigate to={`/desk/listings/${encodeURIComponent(lotId ?? "")}`} replace />;
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
  /** Figures in the chrome are localised the same way the pages localise theirs. */
  const v = useCallback((value: string | number) => translate(language, String(value)), [language]);

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
      setNotificationError("");
      navigate(`/login?next=${encodeURIComponent(location.pathname)}`, { replace: true });
      return true;
    },
    [location.pathname, navigate, setUser],
  );

  const closeAllHeaderMenus = () => {
    closeHeaderMenus();
  };


  /** Both workspaces pin Messages to the sidebar; it opens the conversations page. */
  const openMessenger = () => {
    closeAllHeaderMenus();
    navigate("/messages");
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
  /**
   * The header badge and the notification centre count the same way: unread on the server, and not
   * yet reviewed in this browser. Two different counts on two surfaces would be worse than none.
   */
  const unreadNotifications = useMemo(
    () =>
      activeNotifications.filter(
        (notification) => !notification.readAt && !reviewedNotificationIds.includes(notification.id),
      ).length,
    [activeNotifications, reviewedNotificationIds],
  );

  const selectView = (nextView: View) => {
    navigate(routeByView[nextView]);
    closeAllHeaderMenus();
  };

  const handleMarketplaceEditLot = (lot: CropLot) => {
    navigate(`/desk/listings/${encodeURIComponent(lot.id)}`);
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

    closeAllHeaderMenus();

    if (notificationShowsDetails(notification)) {
      setSelectedNotification(notification);
      return;
    }

    if (notification.href) {
      navigate(notification.href);
    }
  };

  /**
   * The notification centre's read toggle. Read state belongs to the server, so this goes through the
   * API and mirrors it locally; the reviewed list is this browser's memory of what has been skimmed
   * and has to move with it, or the row would flip back on the next render.
   */
  const toggleNotificationRead = (notification: AppNotification, read: boolean) => {
    setReviewedNotificationIds((current) => {
      const nextIds = read
        ? current.includes(notification.id)
          ? current
          : [...current, notification.id]
        : current.filter((id) => id !== notification.id);
      saveStoredReviewedNotificationIds(user, nextIds);
      return nextIds;
    });

    if (!user?.accessToken || !backendNotifications?.some((item) => item.id === notification.id)) {
      return;
    }

    const optimisticReadAt = read ? new Date().toISOString() : null;
    setBackendNotifications((current) =>
      current?.map((item) => (item.id === notification.id ? { ...item, readAt: optimisticReadAt } : item)) ?? current,
    );

    const request = read
      ? markNotificationRead(user.accessToken, notification.id)
      : markNotificationUnread(user.accessToken, notification.id);

    request
      .then((updated) => {
        setBackendNotifications((current) =>
          current?.map((item) => (item.id === notification.id ? toAppNotification(updated, user.role) : item)) ?? current,
        );
        setNotificationError("");
      })
      .catch((error) => {
        if (handleProtectedRequestError(error)) return;
        setNotificationError(error instanceof ApiRequestError ? error.message : "Backend service is unavailable. Please try again.");
      });
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
  // Where the account chip goes. Buyers and farmers have a profile page; staff have no profile
  // screen, so their chip opens the console dashboard rather than the Users table it used to.
  const accountHomePath = user?.role === "admin" ? "/admin/dashboard" : "/profile";
  const accountSubtitle =
    user?.role === "admin"
      ? `${t("Operations")} · ${accountDistrict ? `${t(accountDistrict)} HQ` : t("Dhaka HQ")}`
      : `${t(user?.role === "buyer" ? "Buyer" : "Seller")}${accountDistrict ? ` · ${t(accountDistrict)}` : ""}`;
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

  // The topbar carries one role-aware workspace item — "Farmer dashboard" or "Buyer dashboard" —
  // rather than a farmer desk and an order list side by side. Counts belong in the workspace sidebar,
  // next to the section they open, so the global nav never carries a number.
  // Staff enter the console through their account chip; the public nav stays focused on public destinations.
  // One "Dashboard" item for everyone. Where it goes depends on the account: a farmer's desk, a
  // buyer's orders, or the staff console. Naming the role in the label made the bar announce
  // "Buyer dashboard" to signed-out visitors, who have no role yet — and no `next` here means the
  // login lands each account on its own dashboard rather than a guessed one.
  const navItems: Array<{ id: string; label: string; path: string; count?: number; staff?: boolean }> = [
    { id: "market", label: "Marketplace", path: "/marketplace" },
    { id: "prices", label: "Market rates", path: "/prices" },
    { id: "dashboard", label: "Dashboard", path: user ? roleHomePath[user.role] : "/login" },
  ];

  return (
    <LanguageContext.Provider value={language}>
    <Seo language={language} pathname={location.pathname} />
    <Box className="app-shell" lang={language}>
      <Box component="header" className="site-header">
        <IconButton
          className="icon-button mobile-only"
          aria-expanded={menuOpen}
          aria-label={menuOpen ? t("Close menu") : t("Open menu")}
          onClick={toggleMenuOpen}
        >
          {menuOpen ? <X size={21} /> : <Menu size={21} />}
        </IconButton>
        <NavLink className="brand" to="/" onClick={closeAllHeaderMenus} aria-label={t("AmarKrishok home")} end>
          <BrandMark className="brand-mark" />
          <strong>AmarKrishok</strong>
        </NavLink>

        <Box component="nav" className="main-nav" aria-label={t("Main navigation")}>
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
        </Box>

        <Box className="header-actions">
          <Button
            className="language-toggle"
            aria-label={t("Language switch")}
            onClick={() => setLanguage(language === "en" ? "bn-BD" : "en")}
          >
            EN <span aria-hidden="true">·</span> <span className="bn-glyph">বাংলা</span>
          </Button>
          {/* Splits the site-wide control from everything that belongs to you. */}
          <span className="header-divider" aria-hidden="true" />
          {/* Messages, then notifications: both are "something is waiting for you", in the order
              the handoff's topbar spec has them. */}
          {/* Both open their own page, as the prototype has them: a conversation and a filterable
              notification list both need more room than a dropdown under the icon. */}
          {user ? (
            <NavLink
              aria-label={t("Messages")}
              className="icon-button header-icon-button header-messages-link"
              to="/messages"
              onClick={closeAllHeaderMenus}
            >
              <MessageCircle aria-hidden="true" size={20} />
              {unreadMessages > 0 ? <em className="header-badge">{unreadMessages > 9 ? "9+" : unreadMessages}</em> : null}
            </NavLink>
          ) : null}
          {user ? (
            <NavLink
              aria-label={t("Notifications")}
              className="icon-button notification-button header-notifications-link"
              to="/notifications"
              onClick={closeAllHeaderMenus}
            >
              <Bell aria-hidden="true" size={19} />
              {unreadNotifications > 0 ? (
                <span className="notification-badge">{v(unreadNotifications)}</span>
              ) : null}
            </NavLink>
          ) : null}
          {/* Signed out, the demo shows the two calls to action directly rather than a menu. */}
          {!user ? (
            <Box component="span" className="header-auth">
              <NavLink className="text-link" to="/login" onClick={closeAllHeaderMenus}>
                {t("Log in")}
              </NavLink>
              <Button className="primary-button danger-button" variant="contained" type="button" onClick={openHeaderRegisterChoice}>
                {t("Sign up free")}
              </Button>
            </Box>
          ) : null}
          {/* One account block for every role: avatar, name, and Log out. Staff used to get a chip
              with no way out of the app except the console sidebar, and buyers and farmers got a
              different-looking one. */}
          {user ? (
            <Box className="participant-account">
              <NavLink
                aria-label={t("Open profile")}
                className="participant-profile"
                to={accountHomePath}
                onClick={closeAllHeaderMenus}
              >
                <span className={`participant-profile-initials${headerAvatarObjectUrl ? " has-photo" : ""}`} aria-hidden="true">
                  {headerAvatarObjectUrl ? <img alt="" src={headerAvatarObjectUrl} /> : accountInitials}
                </span>
                <span className="participant-profile-copy">
                  <strong>{user.name}</strong>
                  <small>{accountSubtitle}</small>
                </span>
              </NavLink>
              <Button className="secondary-button participant-logout-button" variant="outlined" type="button" onClick={requestLogout}>
                <LogOut aria-hidden="true" size={17} />
                <span>{t("Log out")}</span>
              </Button>
            </Box>
          ) : null}
        </Box>

        {menuOpen && (
          <Box component="nav" className="mobile-menu-panel" aria-label={t("Mobile navigation")}>
            <Box className="mobile-menu-links">
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
            </Box>
            <Box className="mobile-menu-actions">
              <Button
                className="language-toggle"
                aria-label={t("Language switch")}
                onClick={() => setLanguage(language === "en" ? "bn-BD" : "en")}
              >
                EN <span aria-hidden="true">·</span> <span className="bn-glyph">বাংলা</span>
              </Button>
              {!user ? (
                <>
                  <NavLink className="mobile-menu-action-link" to="/login" onClick={closeAllHeaderMenus}>{t("Log in")}</NavLink>
                  <Button className="mobile-menu-signup" variant="contained" type="button" onClick={openHeaderRegisterChoice}>{t("Sign up free")}</Button>
                </>
              ) : null}
              {user ? (
                <>
                  <NavLink className="mobile-menu-action-link" to={accountHomePath} onClick={closeAllHeaderMenus}>
                    <span className={`mobile-menu-avatar${headerAvatarObjectUrl ? " has-photo" : ""}`} aria-hidden="true">
                      {headerAvatarObjectUrl ? <img alt="" src={headerAvatarObjectUrl} /> : accountInitials}
                    </span>
                    <span>{user.name}</span>
                  </NavLink>
                  <Button className="mobile-menu-action-link" type="button" onClick={requestLogout}><LogOut aria-hidden="true" size={17} />{t("Log out")}</Button>
                </>
              ) : null}
            </Box>
          </Box>
        )}
      </Box>
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
        {/* The buyer workspace. A farmer landing here belongs on their own dashboard. */}
        <Route
          path="/orders"
          element={
            user?.role === "farmer" ? (
              <Navigate to="/desk" replace />
            ) : (
              <ProtectedRoute allowedRoles={["admin", "buyer"]} user={user} t={t}>
                <BuyerDashboardPage lots={marketplaceLots} onOpenMessages={openMessenger} user={user} />
              </ProtectedRoute>
            )
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
        {/* The farmer workspace. Posting and editing keep their own route, as the v2 IA has them. */}
        <Route
          path="/desk"
          element={
            <ProtectedRoute allowedRoles={["farmer", "admin"]} user={user} t={t}>
              <FarmerDashboardPage onOpenMessages={openMessenger} user={user} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/desk/listings/:lotId"
          element={
            <ProtectedRoute allowedRoles={["farmer", "admin"]} user={user} t={t}>
              <EditListingPage user={user} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/desk/post"
          element={
            <ProtectedRoute allowedRoles={["farmer", "admin"]} user={user} t={t}>
              <PostCropPage user={user} />
            </ProtectedRoute>
          }
        />
        {/* The desk used to live under /farmer. Every link and notification that still points there
            keeps working rather than dropping a farmer on the home page. */}
        <Route path="/farmer" element={<Navigate to="/desk" replace />} />
        <Route path="/farmer/post" element={<Navigate to="/desk/post" replace />} />
        <Route path="/farmer/listings/:lotId" element={<FarmerListingRedirect />} />
        {/* The buyer's workspace is /orders now. /buyer keeps the older direct order-request form,
            which the v2 IA has no screen for; it is reachable but no longer linked from the nav. */}
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
                  // Staff messaging from a user record: the page finds their thread or starts one.
                  closeAllHeaderMenus();
                  const query = new URLSearchParams({ name: target.name, phone: target.phone, role: target.role });
                  if (target.id) {
                    query.set("id", target.id);
                  }
                  navigate(`/messages?${query.toString()}`);
                }}
                chatThreads={chatThreads}
                orderCount={notificationOrders.length}
                openDisputeCount={notificationOrders.filter((order) => Boolean(order.disputeOpenedAt)).length}
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
        <Route path="/register" element={<Navigate to="/register/farmer" replace />} />
        <Route path="/register/buyer" element={<RegisterPage role="buyer" onRegister={handleRegister} />} />
        <Route path="/register/farmer" element={<RegisterPage role="farmer" onRegister={handleRegister} />} />
        <Route path="/signed-out" element={<SignedOutPage />} />
        {/* Notifications and conversations are their own screens, as the v2 IA has them. */}
        <Route
          path="/notifications"
          element={
            <ProtectedRoute allowedRoles={["admin", "buyer", "farmer"]} user={user} t={t}>
              <NotificationsPage
                notifications={activeNotifications}
                onMarkAllRead={markAllNotificationsReviewed}
                onOpenNotification={openNotification}
                onToggleRead={toggleNotificationRead}
                reviewedIds={reviewedNotificationIds}
              />
            </ProtectedRoute>
          }
        />
        <Route
          path="/messages"
          element={
            <ProtectedRoute allowedRoles={["admin", "buyer", "farmer"]} user={user} t={t}>
              <MessagesPage user={user} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute allowedRoles={["buyer", "farmer"]} user={user} t={t}>
              <ProfilePage
                user={user}
                onProfileSaved={handleProfileSaved}
                onContactSupport={openMessenger}
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
      <Dialog
        open={logoutConfirmOpen}
        onClose={() => setLogoutConfirmOpen(false)}
        aria-labelledby="logout-confirm-title"
        slotProps={{
          backdrop: { className: "admin-modal-backdrop" },
          paper: { className: "admin-modal confirm-modal" },
        }}
      >
            <Box className="admin-modal-header">
              <Box>
                <Typography component="span">{t("Account session")}</Typography>
                <Typography component="h2" id="logout-confirm-title">{t("Log out?")}</Typography>
              </Box>
              <IconButton className="icon-button" aria-label={t("Close modal")} onClick={() => setLogoutConfirmOpen(false)}>
                <X size={20} />
              </IconButton>
            </Box>
            <Box className="confirm-modal-body">
              <LogOut size={22} />
              <Typography component="strong">{t("Do you want to log out?")}</Typography>
              {/* Escrow keeps running whether or not you are signed in — say so when money is held. */}
              {heldOrderCount > 0 ? (
                <Typography component="p">
                  {t("You have")} {t(String(heldOrderCount))}{" "}
                  {t(heldOrderCount === 1 ? "order still in escrow." : "orders still in escrow.")}{" "}
                  {t("Escrow keeps running whether you are signed in or not.")}
                </Typography>
              ) : (
                <Typography component="p">{t("You can stay signed in or log out of this device.")}</Typography>
              )}
            </Box>
            <Box className="confirm-modal-actions">
              <Button className="secondary-button" variant="outlined" type="button" onClick={() => setLogoutConfirmOpen(false)}>
                {t("Stay logged in")}
              </Button>
              <Button className="primary-button danger-button" color="error" variant="contained" type="button" onClick={completeLogout}>
                {t("Log out")}
              </Button>
            </Box>
      </Dialog>
    </Box>
    </LanguageContext.Provider>
  );
}
