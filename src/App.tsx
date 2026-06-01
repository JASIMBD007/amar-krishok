import { useEffect, useMemo } from "react";
import { Navigate, NavLink, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import {
  Bell,
  ChevronDown,
  LockKeyhole,
  Menu,
  ShoppingBag,
  Sprout,
  X,
} from "lucide-react";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { Seo } from "./components/Seo";
import { FloatingSupportChat } from "./components/chat/FloatingSupportChat";
import { roleCanOpenPath } from "./components/pages/pageHelpers";
import { LanguageContext, translate } from "./i18n";
import { lots, roleOptions, routeByView, views } from "./data";
import { AdminPage, HomePage, LoginPage, MarketplacePage, OrderPage, PostCropPage, PricesPage, RegisterPage } from "./components/pages";
import { useAppStore } from "./store/useAppStore";
import type { AuthUser, RegisteredAccount, Role, View } from "./types";

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

  const selectView = (nextView: View) => {
    navigate(routeByView[nextView]);
    closeHeaderMenus();
  };

  const chooseRole = (role: Role, targetView: View) => {
    const targetPath = routeByView[targetView];
    if (user && roleCanOpenPath(user.role, targetPath)) {
      navigate(targetPath);
      closeHeaderMenus();
      return;
    }

    navigate(`/login?role=${role}&next=${encodeURIComponent(targetPath)}`);
    closeHeaderMenus();
  };

  const handleLogin = (nextUser: AuthUser, nextPath: string) => {
    setUser(nextUser);
    navigate(nextPath);
    closeHeaderMenus();
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
    closeHeaderMenus();
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
          onClick={toggleMenuOpen}
        >
          {menuOpen ? <X size={21} /> : <Menu size={21} />}
        </button>
        <NavLink className="brand" to="/" onClick={closeHeaderMenus} aria-label={t("AmarKrishok home")} end>
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
            <NavLink end={item.path === "/"} key={item.id} to={item.path} onClick={closeHeaderMenus}>
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
          <button className="icon-button" type="button" aria-label={t("Notifications")}>
            <Bell size={18} />
          </button>
          <div className="login-shell">
            <button
              className="secondary-button"
              type="button"
              aria-expanded={loginOpen}
              aria-haspopup="menu"
              onClick={toggleLoginOpen}
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
                    <NavLink className="role-option" to="/register/buyer" onClick={closeHeaderMenus}>
                      <ShoppingBag size={18} />
                      <span>
                        <strong>{t("Register buyer")}</strong>
                        <small>{t("New buyer account")}</small>
                      </span>
                    </NavLink>
                    <NavLink className="role-option" to="/register/farmer" onClick={closeHeaderMenus}>
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
              <NavLink end={item.path === "/"} key={item.id} to={item.path} onClick={closeHeaderMenus}>
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
              <PostCropPage chatThreads={chatThreads} user={user} onProfileSaved={handleProfileSaved} onSendChatMessage={sendUserChatMessage} />
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
