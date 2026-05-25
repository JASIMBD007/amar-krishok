import { useEffect, useMemo, useState } from "react";
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
import { LanguageContext, translate } from "./i18n";
import { lots, roleOptions, routeByView, views } from "./data";
import { AdminView, BuyerView, FarmerView, HomeView, LoginView, MarketplaceView, PricesView, RegisterView } from "./views";
import type {
  AccountStatus,
  AuthUser,
  Language,
  RegisteredAccount,
  Role,
  View,
} from "./types";

const AUTH_STORAGE_KEY = "amarKrishokAuth";
const REGISTRATION_STORAGE_KEY = "amarKrishokRegistrations";

function readStoredUser() {
  try {
    const savedUser = window.localStorage.getItem(AUTH_STORAGE_KEY);
    if (!savedUser) {
      return null;
    }

    const user = JSON.parse(savedUser) as AuthUser;
    return roleOptions.some((option) => option.role === user.role) ? user : null;
  } catch {
    return null;
  }
}

function readStoredRegistrations() {
  try {
    const savedRegistrations = window.localStorage.getItem(REGISTRATION_STORAGE_KEY);
    if (!savedRegistrations) {
      return [];
    }

    const registrations = JSON.parse(savedRegistrations) as RegisteredAccount[];
    return registrations.filter((account) => account.role === "buyer" || account.role === "farmer");
  } catch {
    return [];
  }
}

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const [query, setQuery] = useState("");
  const [district, setDistrict] = useState("All districts");
  const [user, setUser] = useState<AuthUser | null>(() => readStoredUser());
  const [registrations, setRegistrations] = useState<RegisteredAccount[]>(() => readStoredRegistrations());
  const [loginOpen, setLoginOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [language, setLanguage] = useState<Language>("en");
  const t = (text: string) => translate(language, text);

  useEffect(() => {
    if (user) {
      window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
      return;
    }

    window.localStorage.removeItem(AUTH_STORAGE_KEY);
  }, [user]);

  useEffect(() => {
    window.localStorage.setItem(REGISTRATION_STORAGE_KEY, JSON.stringify(registrations));
  }, [registrations]);

  useEffect(() => {
    if (!user || user.role === "admin") {
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
    setMenuOpen(false);
    setLoginOpen(false);
  };

  const chooseRole = (role: Role, targetView: View) => {
    navigate(`/login?role=${role}&next=${encodeURIComponent(routeByView[targetView])}`);
    setMenuOpen(false);
    setLoginOpen(false);
  };

  const handleLogin = (nextUser: AuthUser, nextPath: string) => {
    setUser(nextUser);
    navigate(nextPath);
    setMenuOpen(false);
    setLoginOpen(false);
  };

  const handleRegister = (account: RegisteredAccount) => {
    setRegistrations((currentRegistrations) => [account, ...currentRegistrations]);
  };

  const updateRegistrationStatus = (id: string, status: AccountStatus) => {
    setRegistrations((currentRegistrations) =>
      currentRegistrations.map((account) =>
        account.id === id ? { ...account, status, reviewedAt: new Date().toISOString() } : account,
      ),
    );
  };

  const handleLogout = () => {
    setUser(null);
    setLoginOpen(false);
    if (location.pathname === "/admin" || location.pathname === "/buyer" || location.pathname === "/farmer") {
      navigate("/");
    }
  };

  const roleLabel = user ? roleOptions.find((item) => item.role === user.role)?.label : null;

  const closeHeaderMenus = () => {
    setMenuOpen(false);
    setLoginOpen(false);
  };

  return (
    <LanguageContext.Provider value={language}>
    <main className="app-shell" lang={language === "bn" ? "bn" : "en"}>
      <header className="site-header">
        <button
          className="icon-button mobile-only"
          type="button"
          aria-expanded={menuOpen}
          aria-label={menuOpen ? t("Close menu") : t("Open menu")}
          onClick={() => setMenuOpen((value) => !value)}
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
              onClick={() => setLoginOpen((value) => !value)}
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
        <Route path="/" element={<HomeView setView={selectView} />} />
        <Route
          path="/marketplace"
          element={
            <MarketplaceView
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
              <FarmerView />
            </ProtectedRoute>
          }
        />
        <Route
          path="/buyer"
          element={
            <ProtectedRoute allowedRoles={["buyer", "admin"]} user={user} t={t}>
              <BuyerView />
            </ProtectedRoute>
          }
        />
        <Route path="/prices" element={<PricesView />} />
        <Route
          path="/admin"
          element={
            <ProtectedRoute allowedRoles={["admin"]} user={user} t={t}>
              <AdminView registrations={registrations} onUpdateRegistration={updateRegistrationStatus} />
            </ProtectedRoute>
          }
        />
        <Route path="/login" element={<LoginView onLogin={handleLogin} registrations={registrations} user={user} />} />
        <Route path="/register" element={<Navigate to="/register/buyer" replace />} />
        <Route path="/register/buyer" element={<RegisterView registrations={registrations} role="buyer" onRegister={handleRegister} />} />
        <Route path="/register/farmer" element={<RegisterView registrations={registrations} role="farmer" onRegister={handleRegister} />} />
        <Route path="/market" element={<Navigate to="/marketplace" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </main>
    </LanguageContext.Provider>
  );
}
