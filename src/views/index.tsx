import React, { useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  BadgeCheck,
  Banknote,
  BarChart3,
  Bell,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ClipboardCheck,
  Clock3,
  Gauge,
  HeartHandshake,
  HandCoins,
  LayoutDashboard,
  ListFilter,
  LockKeyhole,
  MapPin,
  Menu,
  MessageSquareText,
  PackageCheck,
  Plus,
  Route as RouteIcon,
  Search,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Sprout,
  Store,
  X,
  TrendingDown,
  TrendingUp,
  Truck,
  UserRoundCheck,
  UsersRound,
  WalletCards,
} from "lucide-react";
import {
  adminNavItems,
  adminPriceSignals,
  adminRoutes,
  dashboardStats,
  lots,
  orders,
  prices,
  roleHomePath,
  roleOptions,
} from "../data";
import { CropCard, FormGrid, Input, SectionTitle } from "../components/shared";
import { useTranslate, useValueText } from "../i18n";
import type {
  AccountStatus,
  AdminSection,
  AuthUser,
  CropLot,
  DashboardStat,
  Order,
  RegisteredAccount,
  RegistrationRole,
  Role,
  View,
} from "../types";

function makeRegistrationId(role: RegistrationRole) {
  return `${role.toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
}

function roleCanOpenPath(role: Role, path: string) {
  if (path.startsWith("/admin")) {
    return role === "admin";
  }

  if (path.startsWith("/buyer")) {
    return role === "buyer" || role === "admin";
  }

  if (path.startsWith("/farmer")) {
    return role === "farmer" || role === "admin";
  }

  return true;
}

function TrendIcon({ trend }: { trend: DashboardStat["trend"] }) {
  if (trend === "down") {
    return <TrendingDown size={17} />;
  }

  if (trend === "up") {
    return <TrendingUp size={17} />;
  }

  return <Gauge size={17} />;
}

function statusClass(status: Order["status"]) {
  return status.toLowerCase().replaceAll(" ", "-");
}

export function LoginView({
  onLogin,
  registrations,
  user,
}: {
  onLogin: (nextUser: AuthUser, nextPath: string) => void;
  registrations: RegisteredAccount[];
  user: AuthUser | null;
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const t = useTranslate();
  const v = useValueText();
  const params = new URLSearchParams(location.search);
  const queryRole = params.get("role");
  const safeQueryRole = roleOptions.some((option) => option.role === queryRole) ? (queryRole as Role) : "buyer";
  const queryNext = params.get("next") ?? roleHomePath[safeQueryRole];
  const safeNext = queryNext.startsWith("/") && !queryNext.startsWith("//") ? queryNext : roleHomePath[safeQueryRole];
  const [role, setRole] = useState<Role>(safeQueryRole);
  const [name, setName] = useState(user?.role === safeQueryRole ? user.name : "");
  const [phone, setPhone] = useState(user?.role === safeQueryRole ? user.phone : "");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const roleOption = roleOptions.find((option) => option.role === role) ?? roleOptions[1];
  const RoleIcon = roleOption.icon;

  const submitLogin = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const cleanName = name.trim();
    const cleanPhone = phone.trim();

    if (!cleanName) {
      setError(t("Please enter your name."));
      return;
    }

    if (cleanPhone.replace(/\D/g, "").length < 10) {
      setError(t("Please enter a valid mobile number."));
      return;
    }

    if (password.length < 4) {
      setError(t("PIN must be at least 4 characters."));
      return;
    }

    if (role !== "admin") {
      const account = registrations.find((item) => item.role === role && item.phone === cleanPhone);

      if (!account) {
        setError(t("Account not found. Please register first."));
        return;
      }

      if (account.status === "pending") {
        setError(t("Account is waiting for admin verification."));
        return;
      }

      if (account.status === "rejected") {
        setError(t("Registration was not approved. Please contact admin."));
        return;
      }

      if (account.password !== password) {
        setError(t("Password does not match."));
        return;
      }

      const nextPath = roleCanOpenPath(role, safeNext) ? safeNext : roleHomePath[role];
      onLogin({ accountId: account.id, name: account.name, phone: account.phone, role, signedInAt: new Date().toISOString() }, nextPath);
      return;
    }

    const nextPath = roleCanOpenPath(role, safeNext) ? safeNext : roleHomePath[role];
    onLogin({ name: cleanName, phone: cleanPhone, role, signedInAt: new Date().toISOString() }, nextPath);
  };

  return (
    <section className="page-wrap auth-layout">
      <form className="panel auth-panel" onSubmit={submitLogin}>
        <div className="auth-icon">
          <RoleIcon size={28} />
        </div>
        <span>{t("Secure login")}</span>
        <h1>{t("Login to continue")}</h1>
        <p>{t("Choose your role and sign in to access protected AmarKrishok tools.")}</p>

        <label className="input-field">
          <span>{t("Role")}</span>
          <select value={role} onChange={(event) => setRole(event.target.value as Role)}>
            {roleOptions.map((option) => (
              <option key={option.role} value={option.role}>
                {t(option.label)}
              </option>
            ))}
          </select>
        </label>

        <label className="input-field">
          <span>{t("Full name")}</span>
          <input value={name} onChange={(event) => setName(event.target.value)} placeholder={t("Sample full name")} />
        </label>
        <label className="input-field">
          <span>{t("Mobile number")}</span>
          <input value={phone} onChange={(event) => setPhone(event.target.value)} inputMode="tel" placeholder={v("01700000000")} />
        </label>
        <label className="input-field">
          <span>{t("PIN or password")}</span>
          <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" placeholder={v("1234")} />
          <small>{t("Use any 4+ character PIN for this prototype.")}</small>
        </label>

        {error && <p className="auth-error">{error}</p>}

        <div className="auth-actions">
          <button className="secondary-button" type="button" onClick={() => navigate("/")}>
            {t("Go home")}
          </button>
          {role !== "admin" && (
            <NavLink className="secondary-button" to={`/register/${role}`}>
              {t("Register")}
            </NavLink>
          )}
          <button className="primary-button" type="submit">
            <LockKeyhole size={17} />
            {t("Sign in")}
          </button>
        </div>
      </form>
    </section>
  );
}

export function RegisterView({
  onRegister,
  registrations,
  role,
}: {
  onRegister: (account: RegisteredAccount) => void;
  registrations: RegisteredAccount[];
  role: RegistrationRole;
}) {
  const navigate = useNavigate();
  const t = useTranslate();
  const v = useValueText();
  const roleOption = roleOptions.find((option) => option.role === role) ?? roleOptions[1];
  const RoleIcon = roleOption.icon;
  const [submittedAccount, setSubmittedAccount] = useState<RegisteredAccount | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [organization, setOrganization] = useState("");
  const [district, setDistrict] = useState("");
  const [address, setAddress] = useState("");
  const [identity, setIdentity] = useState("");
  const [focus, setFocus] = useState("");
  const [error, setError] = useState("");
  const title = role === "buyer" ? "Create buyer account" : "Create seller account";

  const submitRegistration = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const cleanName = name.trim();
    const cleanPhone = phone.trim();
    const cleanPassword = password.trim();
    const cleanOrganization = organization.trim();
    const cleanDistrict = district.trim();
    const cleanAddress = address.trim();
    const cleanIdentity = identity.trim();
    const cleanFocus = focus.trim();

    if (!cleanName || !cleanPhone || !cleanPassword || !cleanOrganization || !cleanDistrict || !cleanAddress || !cleanIdentity || !cleanFocus) {
      setError(t("Please fill in all registration fields."));
      return;
    }

    if (cleanPhone.replace(/\D/g, "").length < 10) {
      setError(t("Please enter a valid mobile number."));
      return;
    }

    if (cleanPassword.length < 4) {
      setError(t("PIN must be at least 4 characters."));
      return;
    }

    const existingAccount = registrations.find((account) => account.role === role && account.phone === cleanPhone && account.status !== "rejected");
    if (existingAccount) {
      setError(t("An account with this role and phone already exists."));
      return;
    }

    const nextAccount: RegisteredAccount = {
      id: makeRegistrationId(role),
      role,
      status: "pending",
      name: cleanName,
      phone: cleanPhone,
      password: cleanPassword,
      organization: cleanOrganization,
      district: cleanDistrict,
      address: cleanAddress,
      identity: cleanIdentity,
      focus: cleanFocus,
      submittedAt: new Date().toISOString(),
    };

    onRegister(nextAccount);
    setSubmittedAccount(nextAccount);
    setError("");
  };

  if (submittedAccount) {
    return (
      <section className="page-wrap auth-layout">
        <div className="panel auth-panel">
          <div className="auth-icon">
            <CheckCircle2 size={28} />
          </div>
          <span>{t("Registration submitted")}</span>
          <h1>{t("Registration submitted")}</h1>
          <div className="auth-notice pending">
            <Clock3 size={20} />
            <div>
              <strong>{t("Pending verification")}</strong>
              <p>{t("Your account is pending admin verification. You can sign in after approval.")}</p>
            </div>
          </div>
          <div className="registration-summary">
            <span>{t(roleOption.label)}</span>
            <strong>{submittedAccount.name}</strong>
            <small>{submittedAccount.phone}</small>
          </div>
          <div className="auth-actions">
            <NavLink className="secondary-button" to="/">
              {t("Go home")}
            </NavLink>
            <NavLink className="primary-button" to={`/login?role=${role}&next=${encodeURIComponent(roleHomePath[role])}`}>
              {t("Back to login")}
            </NavLink>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="page-wrap auth-layout">
      <form className="panel auth-panel" onSubmit={submitRegistration}>
        <div className="auth-icon">
          <RoleIcon size={28} />
        </div>
        <span>{t("New registration")}</span>
        <h1>{t(title)}</h1>
        <p>{t("Submit your information. Admin will verify it before your account becomes active.")}</p>

        <label className="input-field">
          <span>{t("Full name")}</span>
          <input value={name} onChange={(event) => setName(event.target.value)} placeholder={t("Sample full name")} />
        </label>
        <label className="input-field">
          <span>{t("Mobile number")}</span>
          <input value={phone} onChange={(event) => setPhone(event.target.value)} inputMode="tel" placeholder={v("01700000000")} />
        </label>
        <label className="input-field">
          <span>{t("PIN or password")}</span>
          <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" placeholder={v("1234")} />
        </label>
        <label className="input-field">
          <span>{t("Business / farm name")}</span>
          <input value={organization} onChange={(event) => setOrganization(event.target.value)} placeholder={t("Shop, restaurant, company, or farm")} />
        </label>
        <label className="input-field">
          <span>{t("District")}</span>
          <input value={district} onChange={(event) => setDistrict(event.target.value)} placeholder={t("Jashore")} />
        </label>
        <label className="input-field">
          <span>{t("Address")}</span>
          <input value={address} onChange={(event) => setAddress(event.target.value)} placeholder={t("Dhaka North")} />
        </label>
        <label className="input-field">
          <span>{t("NID / trade license")}</span>
          <input value={identity} onChange={(event) => setIdentity(event.target.value)} placeholder={t("Sample identity")} />
        </label>
        <label className="input-field">
          <span>{t("Crop interest / supply focus")}</span>
          <input value={focus} onChange={(event) => setFocus(event.target.value)} placeholder={t("Tomato, potato, chilli...")} />
        </label>

        {error && <p className="auth-error">{error}</p>}

        <div className="auth-actions">
          <button className="secondary-button" type="button" onClick={() => navigate("/")}>
            {t("Go home")}
          </button>
          <button className="primary-button" type="submit">
            <ClipboardCheck size={17} />
            {t("Submit registration")}
          </button>
        </div>
      </form>
    </section>
  );
}

export function HomeView({ setView }: { setView: (view: View) => void }) {
  const t = useTranslate();
  const v = useValueText();
  return (
    <>
      <section className="hero-section">
        <div className="hero-copy">
          <div className="status-pill">
            <ShieldCheck size={16} />
            {t("Verified farmer-to-buyer marketplace")}
          </div>
          <h1>{t("Farmers post crops. Buyers order directly. Admins manage the chain.")}</h1>
          <p>
            {t("A direct supply-chain platform for Bangladesh where farmers post harvests, buyers order transparently, logistics partners deliver, and payments stay protected.")}
          </p>
          <div className="hero-actions">
            <button className="primary-button" type="button" onClick={() => setView("market")}>
              {t("Browse crops")}
            </button>
            <button className="secondary-button large" type="button" onClick={() => setView("farmer")}>
              {t("Post a crop")}
            </button>
          </div>
        </div>

        <div className="market-console">
          <div className="console-header">
            <div>
              <span>{t("Today's supply")}</span>
              <strong>{t("Live lots from verified farmers")}</strong>
            </div>
            <ListFilter size={20} />
          </div>
          <div className="listing-grid compact">
            {lots.slice(0, 3).map((lot) => (
              <CropCard lot={lot} key={lot.id} onOrder={() => setView("buyer")} t={t} v={v} />
            ))}
          </div>
        </div>
      </section>

      <section className="metrics-band" aria-label={t("Platform metrics")}>
        <div>
          <strong>{v("27.4 tons")}</strong>
          <span>{t("active verified supply")}</span>
        </div>
        <div>
          <strong>{v("18")}</strong>
          <span>{t("orders confirmed today")}</span>
        </div>
        <div>
          <strong>{v("16.8%")}</strong>
          <span>{t("average farmer price lift")}</span>
        </div>
        <div>
          <strong>{v("৳82K")}</strong>
          <span>{t("escrow pending release")}</span>
        </div>
      </section>

      <section className="workflow-section">
        {[
          { icon: Sprout, title: "Farmer posts crop", text: "Crop, district, quantity, grade, harvest date, and asking price." },
          { icon: ShoppingBag, title: "Buyer orders", text: "Retailers and restaurants reserve lots or request bulk supply." },
          { icon: Truck, title: "Logistics runs", text: "Pickup, delivery, and proof stay visible to all parties." },
          { icon: WalletCards, title: "Admin releases payout", text: "Escrow protects buyers and pays farmers after confirmation." },
        ].map((step) => {
          const Icon = step.icon;
          return (
            <article className="workflow-card" key={step.title}>
              <Icon size={24} />
              <h3>{t(step.title)}</h3>
              <p>{t(step.text)}</p>
            </article>
          );
        })}
      </section>

      <section className="trust-section" id="trust">
        <div className="trust-panel">
          <div className="section-title trust-title">
            <span>{t("Trust layer")}</span>
            <h1>{t("Quality, payment, and delivery stay visible.")}</h1>
            <p>
              {t("AmarKrishok reduces middleman abuse by keeping lot grading, escrow status, buyer history, and delivery proof in one shared record.")}
            </p>
          </div>

          <div className="trust-list">
            <div>
              <ClipboardCheck size={20} />
              <span>{t("Digital quality checklist before pickup")}</span>
            </div>
            <div>
              <Clock3 size={20} />
              <span>{t("Delivery milestones with buyer confirmation")}</span>
            </div>
            <div>
              <HeartHandshake size={20} />
              <span>{t("Farmer co-op groups for bulk orders")}</span>
            </div>
          </div>
        </div>

        <aside className="buyer-card" aria-label={t("Buyer request")}>
          <div className="buyer-card-header">
            <ShoppingBag size={22} />
            <span>{t("Buyer request")}</span>
          </div>
          <h3>{t("Need 2 tons tomato for Dhaka retail chain")}</h3>
          <p>{t("Preferred delivery: next morning. Escrow ready after lot approval.")}</p>
          <button className="primary-button full" type="button" onClick={() => setView("buyer")}>
            {t("Match farmers")}
          </button>
        </aside>
      </section>
    </>
  );
}

export function MarketplaceView({
  district,
  filteredLots,
  query,
  setDistrict,
  setQuery,
  setView,
}: {
  district: string;
  filteredLots: CropLot[];
  query: string;
  setDistrict: (value: string) => void;
  setQuery: (value: string) => void;
  setView: (view: View) => void;
}) {
  const t = useTranslate();
  const v = useValueText();
  return (
    <section className="page-wrap">
      <SectionTitle eyebrow="Marketplace" title="Search crops by location and reserve directly from farmers." t={t} />
      <div className="filter-bar">
        <label className="search-field">
          <Search size={18} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t("Search tomato, potato, farmer...")} />
        </label>
        <label className="select-field">
          <MapPin size={18} />
          <select value={district} onChange={(event) => setDistrict(event.target.value)}>
            <option value="All districts">{t("All districts")}</option>
            <option value="Jashore">{t("Jashore")}</option>
            <option value="Bogura">{t("Bogura")}</option>
            <option value="Rangpur">{t("Rangpur")}</option>
            <option value="Pabna">{t("Pabna")}</option>
            <option value="Kushtia">{t("Kushtia")}</option>
          </select>
          <ChevronDown size={16} />
        </label>
      </div>
      <div className="listing-grid market-grid">
        {filteredLots.map((lot) => (
          <CropCard lot={lot} key={lot.id} onOrder={() => setView("buyer")} t={t} v={v} />
        ))}
      </div>
    </section>
  );
}

export function FarmerView() {
  const t = useTranslate();
  return (
    <section className="page-wrap form-layout">
      <SectionTitle eyebrow="Farmer app" title="Post a crop lot for direct buyer orders." t={t} />
      <form className="panel form-panel">
        <FormGrid>
          <Input label="Crop name" placeholder="Tomato" t={t} />
          <Input label="District" placeholder="Jashore" t={t} />
          <Input label="Quantity" placeholder="1.2 tons" t={t} />
          <Input label="Expected price" placeholder="৳34/kg" t={t} />
          <Input label="Harvest date" placeholder="Tomorrow morning" t={t} />
          <Input label="Grade" placeholder="A / B+ / C" t={t} />
        </FormGrid>
        <label className="full-field">
          <span>{t("Notes")}</span>
          <textarea placeholder={t("Packaging, pickup point, storage condition...")} />
        </label>
        <button className="primary-button full" type="button">
          <Plus size={18} />
          {t("Publish crop lot")}
        </button>
      </form>
      <aside className="panel side-panel">
        <UserRoundCheck size={24} />
        <h3>{t("Farmer profile readiness")}</h3>
        <p>{t("Phone OTP, NID, farm location, and bank/mobile wallet details should be verified before payout.")}</p>
        <div className="checklist">
          <span><CheckCircle2 size={18} /> {t("Phone verified")}</span>
          <span><CheckCircle2 size={18} /> {t("Farm location added")}</span>
          <span><Clock3 size={18} /> {t("Wallet verification pending")}</span>
        </div>
      </aside>
    </section>
  );
}

export function BuyerView() {
  const t = useTranslate();
  return (
    <section className="page-wrap form-layout">
      <SectionTitle eyebrow="Buyer order" title="Place a direct order or bulk request." t={t} />
      <form className="panel form-panel">
        <FormGrid>
          <Input label="Buyer name" placeholder="Restaurant / retailer / family group" t={t} />
          <Input label="Crop needed" placeholder="Tomato" t={t} />
          <Input label="Quantity" placeholder="2 tons" t={t} />
          <Input label="Delivery area" placeholder="Dhaka North" t={t} />
          <Input label="Target date" placeholder="Tomorrow 8 AM" t={t} />
          <Input label="Offer price" placeholder="৳42/kg" t={t} />
        </FormGrid>
        <label className="full-field">
          <span>{t("Quality requirement")}</span>
          <textarea placeholder={t("Grade, packaging, ripeness, delivery notes...")} />
        </label>
        <button className="primary-button full" type="button">
          <ShoppingBag size={18} />
          {t("Submit order request")}
        </button>
      </form>
      <aside className="panel side-panel">
        <Store size={24} />
        <h3>{t("Matched supply")}</h3>
        <p>{t("Current best match: 3 verified tomato lots from Jashore, total 2.9 tons.")}</p>
        <button className="secondary-button full" type="button">{t("View matched lots")}</button>
      </aside>
    </section>
  );
}

export function PricesView() {
  const t = useTranslate();
  const v = useValueText();
  return (
    <section className="page-wrap">
      <SectionTitle eyebrow="Market prices" title="Daily farmer, wholesale, and retail price signals." t={t} />
      <div className="price-table panel">
        {prices.map((price) => (
          <div className="price-row" key={`${price.crop}-${price.district}`}>
            <div>
              <strong>{t(price.crop)}</strong>
              <span>{t(price.district)}</span>
            </div>
            <div>
              <span>{t("Farmer ask")}</span>
              <strong>{v(`${price.farmerAsk}/kg`)}</strong>
            </div>
            <div>
              <span>{t("Wholesale")}</span>
              <strong>{v(`${price.wholesale}/kg`)}</strong>
            </div>
            <div>
              <span>{t("Retail")}</span>
              <strong>{v(`${price.retail}/kg`)}</strong>
            </div>
            <em>{v(price.trend)}</em>
          </div>
        ))}
      </div>
    </section>
  );
}

export function AdminView({
  onUpdateRegistration,
  registrations,
}: {
  onUpdateRegistration: (id: string, status: AccountStatus) => void;
  registrations: RegisteredAccount[];
}) {
  const t = useTranslate();
  const v = useValueText();
  const [activeAdminSection, setActiveAdminSection] = useState<AdminSection>("dashboard");
  const [adminMenuOpen, setAdminMenuOpen] = useState(false);
  const pendingRegistrations = registrations.filter((account) => account.status === "pending");
  const activeRegistrations = registrations.filter((account) => account.status === "active");
  const rejectedRegistrations = registrations.filter((account) => account.status === "rejected");
  const activeNavItem = adminNavItems.find((item) => item.id === activeAdminSection) ?? adminNavItems[0];
  const activeTitle = activeAdminSection === "dashboard" ? "Operations dashboard" : activeNavItem.label;
  const activeEyebrow = activeAdminSection === "dashboard" ? "Sunday, May 24" : activeNavItem.label;

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

  const statsPanel = (
    <section className="stats-grid" aria-label={t("Business metrics")}>
      {dashboardStats.map((stat) => (
        <article className="stat-card dashboard-stat" key={stat.label}>
          <div className={`trend ${stat.trend}`}>
            <TrendIcon trend={stat.trend} />
          </div>
          <span>{t(stat.label)}</span>
          <strong>{v(stat.value)}</strong>
          <p>{t(stat.detail)}</p>
        </article>
      ))}
    </section>
  );

  const ordersPanel = (wide = false) => (
    <section className={`panel orders-panel ${wide ? "admin-wide-panel" : ""}`} aria-labelledby="orders-heading">
      <div className="panel-header">
        <div>
          <span>{t("Order control")}</span>
          <h2 id="orders-heading">{t("Buyer demand queue")}</h2>
        </div>
        <button className="secondary-button" type="button" onClick={() => openAdminSection("orders")}>
          {t("All orders")}
          <ChevronDown size={17} />
        </button>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>{t("Order")}</th>
              <th>{t("Buyer")}</th>
              <th>{t("Crop")}</th>
              <th>{t("Quantity")}</th>
              <th>{t("Value")}</th>
              <th>{t("Status")}</th>
              <th>{t("ETA")}</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id}>
                <td>
                  <strong>{order.id}</strong>
                  <span>{t(order.destination)}</span>
                </td>
                <td>{t(order.buyer)}</td>
                <td>{t(order.crop)}</td>
                <td>{t(order.quantity)}</td>
                <td>{v(order.value)}</td>
                <td>
                  <em className={`status ${statusClass(order.status)}`}>{t(order.status)}</em>
                </td>
                <td>{order.status === "Matching" ? t("3 farmer groups") : t("Today")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );

  const payoutPanel = (wide = false) => (
    <aside className={`panel action-panel ${wide ? "admin-wide-panel" : ""}`} aria-labelledby="release-heading">
      <div className="panel-header">
        <div>
          <span>{t("Payout action")}</span>
          <h2 id="release-heading">{t("Release queue")}</h2>
        </div>
        <HandCoins size={22} />
      </div>
      <div className="release-amount">
        <span>{t("Ready after QC")}</span>
        <strong>{v("৳82,000")}</strong>
      </div>
      <div className="checklist">
        <span>
          <CheckCircle2 size={18} />
          {t("Delivery photo received")}
        </span>
        <span>
          <CheckCircle2 size={18} />
          {t("Buyer weight confirmed")}
        </span>
        <span>
          <Clock3 size={18} />
          {t("Quality check pending")}
        </span>
      </div>
      <button className="primary-button full" type="button" onClick={() => openAdminSection("payouts")}>
        {t("Review payouts")}
      </button>
    </aside>
  );

  const verificationPanel = (wide = false) => (
    <section className={`panel verification-panel ${wide ? "admin-wide-panel" : ""}`} aria-labelledby="verification-heading">
      <div className="panel-header">
        <div>
          <span>{t("Account verification")}</span>
          <h2 id="verification-heading">{t("Pending verification")}</h2>
        </div>
        <UserRoundCheck size={22} />
      </div>
      <p className="panel-copy">{t("Buyer and seller registrations awaiting admin approval.")}</p>
      <div className="verification-stats">
        <span>
          <strong>{v(pendingRegistrations.length)}</strong>
          {t("Pending verification")}
        </span>
        <span>
          <strong>{v(activeRegistrations.length)}</strong>
          {t("Approved accounts")}
        </span>
        <span>
          <strong>{v(rejectedRegistrations.length)}</strong>
          {t("Rejected accounts")}
        </span>
      </div>
      <div className="verification-list">
        {pendingRegistrations.length === 0 && <em>{t("No pending registrations")}</em>}
        {pendingRegistrations.map((account) => (
          <article className="verification-item" key={account.id}>
            <div>
              <strong>{account.name}</strong>
              <span>{t(account.role === "buyer" ? "Buyer" : "Seller / Farmer")}</span>
            </div>
            <div>
              <span>{account.organization}</span>
              <small>{account.phone}</small>
            </div>
            <p>
              <MapPin size={14} />
              {account.district} · {account.focus}
            </p>
            <div className="verification-actions">
              <button className="secondary-button" type="button" onClick={() => onUpdateRegistration(account.id, "rejected")}>
                {t("Reject")}
              </button>
              <button className="primary-button" type="button" onClick={() => onUpdateRegistration(account.id, "active")}>
                <BadgeCheck size={17} />
                {t("Approve")}
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );

  const supplyPanel = (wide = false, showAllLots = false) => (
    <section className={`panel supply-panel ${wide ? "admin-wide-panel" : ""}`} aria-labelledby="supply-heading">
      <div className="panel-header">
        <div>
          <span>{t("Farmer supply")}</span>
          <h2 id="supply-heading">{t("Verified lots")}</h2>
        </div>
        <button className="secondary-button" type="button" onClick={() => openAdminSection("supply")}>
          <ClipboardCheck size={17} />
          {t("Grade lots")}
        </button>
      </div>

      <div className="supply-list">
        {(showAllLots ? lots : lots.slice(0, 3)).map((lot) => (
          <article className="supply-item" key={lot.id}>
            <img src={lot.image} alt={`${t(lot.crop)} ${t("supply")}`} />
            <div>
              <h3>{t(lot.crop)}</h3>
              <span>{t(lot.farmer)}</span>
              <p>
                <MapPin size={15} />
                {t(lot.district)}
              </p>
            </div>
            <div>
              <strong>{t(lot.quantity)}</strong>
              <span>{v(lot.ask)}</span>
            </div>
            <div>
              <strong>{t("Grade")} {t(lot.grade)}</strong>
              <span>{t(lot.harvest)}</span>
            </div>
            <button className="icon-button" type="button" aria-label={`${t("Approve")} ${t(lot.crop)} ${t("lot")}`}>
              <BadgeCheck size={19} />
            </button>
          </article>
        ))}
      </div>
    </section>
  );

  const pricePanel = (wide = false) => (
    <section className={`panel price-panel ${wide ? "admin-wide-panel" : ""}`} aria-labelledby="price-heading">
      <div className="panel-header">
        <div>
          <span>{t("Price intelligence")}</span>
          <h2 id="price-heading">{t("Farmer vs market spread")}</h2>
        </div>
        <Banknote size={22} />
      </div>

      <div className="price-bars">
        {adminPriceSignals.map((price) => (
          <div className="price-row" key={price.crop}>
            <div className="price-label">
              <strong>{t(price.crop)}</strong>
              <span>{t(price.region)}</span>
            </div>
            <div className="bar-stack" aria-label={`${t(price.crop)} ${t("price comparison")}`}>
              <span style={{ width: `${(price.farmerAsk / price.market) * 100}%` }} />
              <span style={{ width: `${(price.wholesale / price.market) * 100}%` }} />
            </div>
            <strong>{v(`৳${price.market}/kg`)}</strong>
          </div>
        ))}
      </div>
      <div className="legend">
        <span>
          <i className="farmer" />
          {t("Farmer ask")}
        </span>
        <span>
          <i className="wholesale" />
          {t("Wholesale")}
        </span>
      </div>
    </section>
  );

  const logisticsPanel = (wide = false) => (
    <section className={`panel logistics-panel ${wide ? "admin-wide-panel" : ""}`} aria-labelledby="logistics-heading">
      <div className="panel-header">
        <div>
          <span>{t("Logistics board")}</span>
          <h2 id="logistics-heading">{t("Routes in motion")}</h2>
        </div>
        <RouteIcon size={22} />
      </div>

      <div className="route-list">
        {adminRoutes.map((route) => (
          <article className="route-item" key={route.route}>
            <div className="route-icon">
              <Truck size={20} />
            </div>
            <div>
              <h3>{t(route.route)}</h3>
              <span>{t(route.driver)}</span>
            </div>
            <div>
              <strong>{t(route.lots)}</strong>
              <span>{t(route.temperature)}</span>
            </div>
            <em>{t(route.status)}</em>
          </article>
        ))}
      </div>
    </section>
  );

  const messagesPanel = (
    <aside className="panel messages-panel" aria-labelledby="messages-heading">
      <div className="panel-header">
        <div>
          <span>{t("Alerts")}</span>
          <h2 id="messages-heading">{t("Field updates")}</h2>
        </div>
        <MessageSquareText size={22} />
      </div>
      <div className="message-list">
        <span>
          <PackageCheck size={18} />
          {t("Tomato lot AKL-882 passed weight check.")}
        </span>
        <span>
          <CalendarDays size={18} />
          {t("Rangpur potato pickup moved to 8:20 PM.")}
        </span>
        <span>
          <UsersRound size={18} />
          {t("4 new farmers awaiting verification.")}
        </span>
      </div>
    </aside>
  );

  const farmerDirectoryPanel = (
    <section className="panel verification-panel admin-wide-panel" aria-labelledby="farmer-directory-heading">
      <div className="panel-header">
        <div>
          <span>{t("Active accounts")}</span>
          <h2 id="farmer-directory-heading">{t("Verified farmer directory")}</h2>
        </div>
        <UsersRound size={22} />
      </div>
      <div className="verification-list">
        {lots.map((lot) => (
          <article className="verification-item farmer-directory-item" key={`${lot.farmer}-${lot.crop}`}>
            <div>
              <strong>{t(lot.farmer)}</strong>
              <span>{t("Seller / Farmer")}</span>
            </div>
            <div>
              <span>{t("Farm coverage")}</span>
              <small>{t(lot.district)}</small>
            </div>
            <p>
              <Sprout size={14} />
              {t("Supply focus")}: {t(lot.crop)} · {t(lot.quantity)}
            </p>
          </article>
        ))}
      </div>
    </section>
  );

  const payoutSettingsPanel = (
    <section className="panel verification-panel admin-wide-panel" aria-labelledby="payment-settings-heading">
      <div className="panel-header">
        <div>
          <span>{t("Payout action")}</span>
          <h2 id="payment-settings-heading">{t("Payment protection settings")}</h2>
        </div>
        <ShieldCheck size={22} />
      </div>
      <div className="message-list">
        <span>
          <CheckCircle2 size={18} />
          {t("Buyer confirmation required")}
        </span>
        <span>
          <ClipboardCheck size={18} />
          {t("Quality check before release")}
        </span>
        <span>
          <WalletCards size={18} />
          {t("Mobile wallet review")}
        </span>
      </div>
    </section>
  );

  const settingsPanel = (
    <section className="panel verification-panel admin-wide-panel" aria-labelledby="settings-heading">
      <div className="panel-header">
        <div>
          <span>{t("Admin Control")}</span>
          <h2 id="settings-heading">{t("Platform settings")}</h2>
        </div>
        <Settings size={22} />
      </div>
      <div className="message-list">
        <span>
          <UserRoundCheck size={18} />
          {t("Registration approval stays manual")}
        </span>
        <span>
          <LockKeyhole size={18} />
          {t("Buyer and seller routes stay protected")}
        </span>
        <span>
          <MessageSquareText size={18} />
          {t("Bangla and English enabled")}
        </span>
      </div>
    </section>
  );

  const adminContent: Record<AdminSection, React.ReactNode> = {
    dashboard: (
      <>
        {statsPanel}
        <section className="dashboard-grid">
          {ordersPanel()}
          {payoutPanel()}
          {verificationPanel()}
          {supplyPanel()}
          {pricePanel()}
          {logisticsPanel()}
          {messagesPanel}
        </section>
      </>
    ),
    orders: (
      <section className="dashboard-grid admin-focused-grid">
        {ordersPanel(true)}
        {messagesPanel}
      </section>
    ),
    supply: (
      <section className="dashboard-grid admin-focused-grid">
        {supplyPanel(true, true)}
        {pricePanel(true)}
      </section>
    ),
    farmers: (
      <section className="dashboard-grid admin-focused-grid">
        {verificationPanel(true)}
        {farmerDirectoryPanel}
      </section>
    ),
    logistics: (
      <section className="dashboard-grid admin-focused-grid">
        {logisticsPanel(true)}
        {messagesPanel}
      </section>
    ),
    payouts: (
      <section className="dashboard-grid admin-focused-grid">
        {payoutPanel(true)}
        {payoutSettingsPanel}
      </section>
    ),
    settings: (
      <section className="dashboard-grid admin-focused-grid">
        {settingsPanel}
        {messagesPanel}
      </section>
    ),
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

        {adminContent[activeAdminSection]}
      </div>
    </section>
  );
}
