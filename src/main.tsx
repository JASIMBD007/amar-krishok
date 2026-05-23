import React, { useMemo, useState } from "react";
import ReactDOM from "react-dom/client";
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
  Route,
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
import "./styles.css";

type View = "home" | "market" | "farmer" | "buyer" | "prices" | "admin";

type CropLot = {
  id: string;
  crop: string;
  farmer: string;
  district: string;
  quantity: string;
  ask: string;
  grade: string;
  harvest: string;
  image: string;
};

type MarketPrice = {
  crop: string;
  district: string;
  farmerAsk: string;
  wholesale: string;
  retail: string;
  trend: string;
};

type Order = {
  id: string;
  buyer: string;
  crop: string;
  quantity: string;
  destination: string;
  value: string;
  status: "Matching" | "Pickup booked" | "In transit" | "Quality check";
};

type DashboardStat = {
  label: string;
  value: string;
  detail: string;
  trend: "up" | "down" | "steady";
};

type AdminRoute = {
  route: string;
  driver: string;
  lots: string;
  status: string;
  temperature: string;
};

type AdminPriceSignal = {
  crop: string;
  region: string;
  farmerAsk: number;
  wholesale: number;
  market: number;
};

const lots: CropLot[] = [
  {
    id: "LOT-882",
    crop: "Tomato",
    farmer: "Mst. Rahima",
    district: "Jashore",
    quantity: "1.2 tons",
    ask: "৳34/kg",
    grade: "B+",
    harvest: "Ready tomorrow",
    image:
      "https://images.unsplash.com/photo-1592841200221-a6898f307baa?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "LOT-731",
    crop: "Green Chilli",
    farmer: "Abdul Karim",
    district: "Bogura",
    quantity: "420 kg",
    ask: "৳86/kg",
    grade: "A",
    harvest: "Ready today",
    image:
      "https://images.unsplash.com/photo-1583119022894-919a68a3d0e3?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "LOT-640",
    crop: "Potato",
    farmer: "Nayan Mondol",
    district: "Rangpur",
    quantity: "3.6 tons",
    ask: "৳21/kg",
    grade: "A",
    harvest: "Cold stored",
    image:
      "https://images.unsplash.com/photo-1518977676601-b53f82aba655?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "LOT-529",
    crop: "Onion",
    farmer: "Rashed Mia",
    district: "Pabna",
    quantity: "1.8 tons",
    ask: "৳63/kg",
    grade: "A-",
    harvest: "Ready in 2 days",
    image:
      "https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?auto=format&fit=crop&w=900&q=80",
  },
];

const prices: MarketPrice[] = [
  { crop: "Tomato", district: "Jashore", farmerAsk: "৳34", wholesale: "৳42", retail: "৳48", trend: "+8%" },
  { crop: "Potato", district: "Rangpur", farmerAsk: "৳21", wholesale: "৳27", retail: "৳32", trend: "+6%" },
  { crop: "Onion", district: "Pabna", farmerAsk: "৳63", wholesale: "৳74", retail: "৳82", trend: "+11%" },
  { crop: "Chilli", district: "Bogura", farmerAsk: "৳86", wholesale: "৳98", retail: "৳116", trend: "+18%" },
];

const orders: Order[] = [
  { id: "AK-2048", buyer: "Shwapno Retail", crop: "Tomato", quantity: "2.0 tons", destination: "Dhaka North", value: "৳84,000", status: "Matching" },
  { id: "AK-2047", buyer: "Hotel Sarina", crop: "Green Chilli", quantity: "360 kg", destination: "Banani", value: "৳34,920", status: "Pickup booked" },
  { id: "AK-2046", buyer: "Agora Warehouse", crop: "Potato", quantity: "4.5 tons", destination: "Tejgaon", value: "৳1,21,500", status: "In transit" },
  { id: "AK-2045", buyer: "B2B Kitchen Co.", crop: "Onion", quantity: "1.1 tons", destination: "Mirpur", value: "৳81,400", status: "Quality check" },
];

const views: Array<{ id: View; label: string }> = [
  { id: "home", label: "Home" },
  { id: "market", label: "Marketplace" },
  { id: "farmer", label: "Post Crop" },
  { id: "buyer", label: "Order" },
  { id: "prices", label: "Prices" },
  { id: "admin", label: "Admin" },
];

const dashboardStats: DashboardStat[] = [
  { label: "GMV today", value: "৳4.82L", detail: "18 orders confirmed", trend: "up" },
  { label: "Farmer payout", value: "৳3.96L", detail: "৳82K pending escrow", trend: "up" },
  { label: "Active supply", value: "27.4 tons", detail: "63 verified lots", trend: "steady" },
  { label: "Avg price lift", value: "16.8%", detail: "vs local middleman rate", trend: "up" },
];

const adminRoutes: AdminRoute[] = [
  { route: "Bogura - Dhaka", driver: "Hasan Logistics", lots: "3 lots / 1.1 tons", status: "Pickup in 42 min", temperature: "Ambient" },
  { route: "Rangpur - Tejgaon", driver: "North Cold Van", lots: "2 lots / 4.5 tons", status: "In transit", temperature: "8°C" },
  { route: "Jashore - Dhaka", driver: "Padma Cargo", lots: "4 lots / 2.8 tons", status: "Awaiting load", temperature: "Ambient" },
];

const adminPriceSignals: AdminPriceSignal[] = [
  { crop: "Tomato", region: "Jashore", farmerAsk: 34, wholesale: 42, market: 48 },
  { crop: "Potato", region: "Rangpur", farmerAsk: 21, wholesale: 27, market: 32 },
  { crop: "Onion", region: "Pabna", farmerAsk: 63, wholesale: 74, market: 82 },
  { crop: "Chilli", region: "Bogura", farmerAsk: 86, wholesale: 98, market: 116 },
];

const adminNavItems = [
  { label: "Dashboard", icon: LayoutDashboard, active: true },
  { label: "Orders", icon: ShoppingBag },
  { label: "Supply Lots", icon: Sprout },
  { label: "Farmers", icon: UsersRound },
  { label: "Logistics", icon: Truck },
  { label: "Payouts", icon: WalletCards },
  { label: "Settings", icon: Settings },
];

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

function App() {
  const [view, setView] = useState<View>("home");
  const [query, setQuery] = useState("");
  const [district, setDistrict] = useState("All districts");
  const [loggedIn, setLoggedIn] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const filteredLots = useMemo(() => {
    return lots.filter((lot) => {
      const textMatch = `${lot.crop} ${lot.farmer} ${lot.district}`.toLowerCase().includes(query.toLowerCase());
      const districtMatch = district === "All districts" || lot.district === district;
      return textMatch && districtMatch;
    });
  }, [query, district]);

  const selectView = (nextView: View) => {
    setView(nextView);
    setMenuOpen(false);
  };

  return (
    <main className="app-shell">
      <header className="site-header">
        <button
          className="icon-button mobile-only"
          type="button"
          aria-expanded={menuOpen}
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          onClick={() => setMenuOpen((value) => !value)}
        >
          {menuOpen ? <X size={21} /> : <Menu size={21} />}
        </button>
        <button className="brand" type="button" onClick={() => selectView("home")} aria-label="AmarKrishok home">
          <span className="brand-mark">
            <Sprout size={22} strokeWidth={2.6} />
          </span>
          <span>
            <strong>AmarKrishok</strong>
            <small>Fair farm trade</small>
          </span>
        </button>

        <nav className="main-nav" aria-label="Main navigation">
          {views.map((item) => (
            <button className={view === item.id ? "active" : ""} key={item.id} type="button" onClick={() => selectView(item.id)}>
              {item.label}
            </button>
          ))}
        </nav>

        <div className="header-actions">
          <button className="icon-button" type="button" aria-label="Notifications">
            <Bell size={18} />
          </button>
          <button className="secondary-button" type="button" onClick={() => setLoggedIn((value) => !value)}>
            <LockKeyhole size={17} />
            {loggedIn ? "Logged in" : "Login"}
          </button>
        </div>

        {menuOpen && (
          <nav className="mobile-menu-panel" aria-label="Mobile navigation">
            {views.map((item) => (
              <button className={view === item.id ? "active" : ""} key={item.id} type="button" onClick={() => selectView(item.id)}>
                {item.label}
              </button>
            ))}
          </nav>
        )}
      </header>

      {view === "home" && <HomeView setView={selectView} />}
      {view === "market" && (
        <MarketplaceView
          district={district}
          filteredLots={filteredLots}
          query={query}
          setDistrict={setDistrict}
          setQuery={setQuery}
          setView={selectView}
        />
      )}
      {view === "farmer" && <FarmerView />}
      {view === "buyer" && <BuyerView />}
      {view === "prices" && <PricesView />}
      {view === "admin" && <AdminView />}
    </main>
  );
}

function HomeView({ setView }: { setView: (view: View) => void }) {
  return (
    <>
      <section className="hero-section">
        <div className="hero-copy">
          <div className="status-pill">
            <ShieldCheck size={16} />
            Verified farmer-to-buyer marketplace
          </div>
          <h1>Farmers post crops. Buyers order directly. Admins manage the chain.</h1>
          <p>
            A mobile-first platform for Bangladesh that brings fair prices,
            transparent orders, location-based crop search, and admin operations into one place.
          </p>
          <div className="hero-actions">
            <button className="primary-button" type="button" onClick={() => setView("market")}>
              Browse crops
            </button>
            <button className="secondary-button large" type="button" onClick={() => setView("farmer")}>
              Post a crop
            </button>
          </div>
        </div>

        <div className="market-console">
          <div className="console-header">
            <div>
              <span>Today&apos;s supply</span>
              <strong>Live lots from verified farmers</strong>
            </div>
            <ListFilter size={20} />
          </div>
          <div className="listing-grid compact">
            {lots.slice(0, 3).map((lot) => (
              <CropCard lot={lot} key={lot.id} onOrder={() => setView("buyer")} />
            ))}
          </div>
        </div>
      </section>

      <section className="metrics-band" aria-label="Platform metrics">
        <div>
          <strong>27.4 tons</strong>
          <span>active verified supply</span>
        </div>
        <div>
          <strong>18</strong>
          <span>orders confirmed today</span>
        </div>
        <div>
          <strong>16.8%</strong>
          <span>average farmer price lift</span>
        </div>
        <div>
          <strong>৳82K</strong>
          <span>escrow pending release</span>
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
              <h3>{step.title}</h3>
              <p>{step.text}</p>
            </article>
          );
        })}
      </section>

      <section className="trust-section" id="trust">
        <div className="trust-panel">
          <div className="section-title trust-title">
            <span>Trust layer</span>
            <h1>Quality, payment, and delivery stay visible.</h1>
            <p>
              AmarKrishok reduces middleman abuse by keeping lot grading,
              escrow status, buyer history, and delivery proof in one shared
              record.
            </p>
          </div>

          <div className="trust-list">
            <div>
              <ClipboardCheck size={20} />
              <span>Digital quality checklist before pickup</span>
            </div>
            <div>
              <Clock3 size={20} />
              <span>Delivery milestones with buyer confirmation</span>
            </div>
            <div>
              <HeartHandshake size={20} />
              <span>Farmer co-op groups for bulk orders</span>
            </div>
          </div>
        </div>

        <aside className="buyer-card" aria-label="Buyer request">
          <div className="buyer-card-header">
            <ShoppingBag size={22} />
            <span>Buyer request</span>
          </div>
          <h3>Need 2 tons tomato for Dhaka retail chain</h3>
          <p>Preferred delivery: next morning. Escrow ready after lot approval.</p>
          <button className="primary-button full" type="button" onClick={() => setView("buyer")}>
            Match farmers
          </button>
        </aside>
      </section>
    </>
  );
}

function MarketplaceView({
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
  return (
    <section className="page-wrap">
      <SectionTitle eyebrow="Marketplace" title="Search crops by location and reserve directly from farmers." />
      <div className="filter-bar">
        <label className="search-field">
          <Search size={18} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search tomato, potato, farmer..." />
        </label>
        <label className="select-field">
          <MapPin size={18} />
          <select value={district} onChange={(event) => setDistrict(event.target.value)}>
            <option>All districts</option>
            <option>Jashore</option>
            <option>Bogura</option>
            <option>Rangpur</option>
            <option>Pabna</option>
          </select>
          <ChevronDown size={16} />
        </label>
      </div>
      <div className="listing-grid market-grid">
        {filteredLots.map((lot) => (
          <CropCard lot={lot} key={lot.id} onOrder={() => setView("buyer")} />
        ))}
      </div>
    </section>
  );
}

function FarmerView() {
  return (
    <section className="page-wrap form-layout">
      <SectionTitle eyebrow="Farmer app" title="Post a crop lot for direct buyer orders." />
      <form className="panel form-panel">
        <FormGrid>
          <Input label="Crop name" placeholder="Tomato" />
          <Input label="District" placeholder="Jashore" />
          <Input label="Quantity" placeholder="1.2 tons" />
          <Input label="Expected price" placeholder="৳34/kg" />
          <Input label="Harvest date" placeholder="Tomorrow morning" />
          <Input label="Grade" placeholder="A / B+ / C" />
        </FormGrid>
        <label className="full-field">
          <span>Notes</span>
          <textarea placeholder="Packaging, pickup point, storage condition..." />
        </label>
        <button className="primary-button full" type="button">
          <Plus size={18} />
          Publish crop lot
        </button>
      </form>
      <aside className="panel side-panel">
        <UserRoundCheck size={24} />
        <h3>Farmer profile readiness</h3>
        <p>Phone OTP, NID, farm location, and bank/mobile wallet details should be verified before payout.</p>
        <div className="checklist">
          <span><CheckCircle2 size={18} /> Phone verified</span>
          <span><CheckCircle2 size={18} /> Farm location added</span>
          <span><Clock3 size={18} /> Wallet verification pending</span>
        </div>
      </aside>
    </section>
  );
}

function BuyerView() {
  return (
    <section className="page-wrap form-layout">
      <SectionTitle eyebrow="Buyer order" title="Place a direct order or bulk request." />
      <form className="panel form-panel">
        <FormGrid>
          <Input label="Buyer name" placeholder="Restaurant / retailer / family group" />
          <Input label="Crop needed" placeholder="Tomato" />
          <Input label="Quantity" placeholder="2 tons" />
          <Input label="Delivery area" placeholder="Dhaka North" />
          <Input label="Target date" placeholder="Tomorrow 8 AM" />
          <Input label="Offer price" placeholder="৳42/kg" />
        </FormGrid>
        <label className="full-field">
          <span>Quality requirement</span>
          <textarea placeholder="Grade, packaging, ripeness, delivery notes..." />
        </label>
        <button className="primary-button full" type="button">
          <ShoppingBag size={18} />
          Submit order request
        </button>
      </form>
      <aside className="panel side-panel">
        <Store size={24} />
        <h3>Matched supply</h3>
        <p>Current best match: 3 verified tomato lots from Jashore, total 2.9 tons.</p>
        <button className="secondary-button full" type="button">View matched lots</button>
      </aside>
    </section>
  );
}

function PricesView() {
  return (
    <section className="page-wrap">
      <SectionTitle eyebrow="Market prices" title="Daily farmer, wholesale, and retail price signals." />
      <div className="price-table panel">
        {prices.map((price) => (
          <div className="price-row" key={`${price.crop}-${price.district}`}>
            <div>
              <strong>{price.crop}</strong>
              <span>{price.district}</span>
            </div>
            <div>
              <span>Farmer ask</span>
              <strong>{price.farmerAsk}/kg</strong>
            </div>
            <div>
              <span>Wholesale</span>
              <strong>{price.wholesale}/kg</strong>
            </div>
            <div>
              <span>Retail</span>
              <strong>{price.retail}/kg</strong>
            </div>
            <em>{price.trend}</em>
          </div>
        ))}
      </div>
    </section>
  );
}

function AdminView() {
  return (
    <section className="dashboard-shell restored-dashboard">
      <aside className="sidebar" aria-label="Dashboard navigation">
        <div className="admin-brand">
          <LayoutDashboard size={22} />
          <div>
            <strong>Admin Control</strong>
            <small>Supply command</small>
          </div>
        </div>

        <nav className="side-nav">
          {adminNavItems.map((item) => {
            const Icon = item.icon;
            return (
              <button className={item.active ? "active" : ""} type="button" key={item.label}>
                <Icon size={19} />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="trust-summary">
          <ShieldCheck size={22} />
          <strong>Escrow protected</strong>
          <span>৳82,000 ready for farmer release after buyer confirmation.</span>
        </div>
      </aside>

      <div className="workspace dashboard-workspace">
        <header className="dashboard-topbar">
          <button className="mobile-menu" type="button" aria-label="Open admin navigation">
            <Menu size={22} />
          </button>

          <div className="page-title">
            <span>Sunday, May 24</span>
            <h1>Operations dashboard</h1>
          </div>

          <div className="topbar-actions">
            <label className="global-search">
              <Search size={18} />
              <input value="Search order, farmer, district..." readOnly aria-label="Search dashboard" />
            </label>
            <button className="icon-button" type="button" aria-label="Notifications">
              <Bell size={19} />
            </button>
            <button className="primary-button" type="button">
              <Plus size={18} />
              New lot
            </button>
          </div>
        </header>

        <section className="stats-grid" aria-label="Business metrics">
          {dashboardStats.map((stat) => (
            <article className="stat-card dashboard-stat" key={stat.label}>
              <div className={`trend ${stat.trend}`}>
                <TrendIcon trend={stat.trend} />
              </div>
              <span>{stat.label}</span>
              <strong>{stat.value}</strong>
              <p>{stat.detail}</p>
            </article>
          ))}
        </section>

        <section className="dashboard-grid">
          <section className="panel orders-panel" aria-labelledby="orders-heading">
            <div className="panel-header">
              <div>
                <span>Order control</span>
                <h2 id="orders-heading">Buyer demand queue</h2>
              </div>
              <button className="secondary-button" type="button">
                All orders
                <ChevronDown size={17} />
              </button>
            </div>

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Order</th>
                    <th>Buyer</th>
                    <th>Crop</th>
                    <th>Quantity</th>
                    <th>Value</th>
                    <th>Status</th>
                    <th>ETA</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr key={order.id}>
                      <td>
                        <strong>{order.id}</strong>
                        <span>{order.destination}</span>
                      </td>
                      <td>{order.buyer}</td>
                      <td>{order.crop}</td>
                      <td>{order.quantity}</td>
                      <td>{order.value}</td>
                      <td>
                        <em className={`status ${statusClass(order.status)}`}>{order.status}</em>
                      </td>
                      <td>{order.status === "Matching" ? "3 farmer groups" : "Today"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <aside className="panel action-panel" aria-labelledby="release-heading">
            <div className="panel-header">
              <div>
                <span>Payout action</span>
                <h2 id="release-heading">Release queue</h2>
              </div>
              <HandCoins size={22} />
            </div>
            <div className="release-amount">
              <span>Ready after QC</span>
              <strong>৳82,000</strong>
            </div>
            <div className="checklist">
              <span>
                <CheckCircle2 size={18} />
                Delivery photo received
              </span>
              <span>
                <CheckCircle2 size={18} />
                Buyer weight confirmed
              </span>
              <span>
                <Clock3 size={18} />
                Quality check pending
              </span>
            </div>
            <button className="primary-button full" type="button">
              Review payouts
            </button>
          </aside>

          <section className="panel supply-panel" aria-labelledby="supply-heading">
            <div className="panel-header">
              <div>
                <span>Farmer supply</span>
                <h2 id="supply-heading">Verified lots</h2>
              </div>
              <button className="secondary-button" type="button">
                <ClipboardCheck size={17} />
                Grade lots
              </button>
            </div>

            <div className="supply-list">
              {lots.slice(0, 3).map((lot) => (
                <article className="supply-item" key={lot.id}>
                  <img src={lot.image} alt={`${lot.crop} supply`} />
                  <div>
                    <h3>{lot.crop}</h3>
                    <span>{lot.farmer}</span>
                    <p>
                      <MapPin size={15} />
                      {lot.district}
                    </p>
                  </div>
                  <div>
                    <strong>{lot.quantity}</strong>
                    <span>{lot.ask}</span>
                  </div>
                  <div>
                    <strong>Grade {lot.grade}</strong>
                    <span>{lot.harvest}</span>
                  </div>
                  <button className="icon-button" type="button" aria-label={`Approve ${lot.crop} lot`}>
                    <BadgeCheck size={19} />
                  </button>
                </article>
              ))}
            </div>
          </section>

          <section className="panel price-panel" aria-labelledby="price-heading">
            <div className="panel-header">
              <div>
                <span>Price intelligence</span>
                <h2 id="price-heading">Farmer vs market spread</h2>
              </div>
              <Banknote size={22} />
            </div>

            <div className="price-bars">
              {adminPriceSignals.map((price) => (
                <div className="price-row" key={price.crop}>
                  <div className="price-label">
                    <strong>{price.crop}</strong>
                    <span>{price.region}</span>
                  </div>
                  <div className="bar-stack" aria-label={`${price.crop} price comparison`}>
                    <span style={{ width: `${(price.farmerAsk / price.market) * 100}%` }} />
                    <span style={{ width: `${(price.wholesale / price.market) * 100}%` }} />
                  </div>
                  <strong>৳{price.market}/kg</strong>
                </div>
              ))}
            </div>
            <div className="legend">
              <span>
                <i className="farmer" />
                Farmer ask
              </span>
              <span>
                <i className="wholesale" />
                Wholesale
              </span>
            </div>
          </section>

          <section className="panel logistics-panel" aria-labelledby="logistics-heading">
            <div className="panel-header">
              <div>
                <span>Logistics board</span>
                <h2 id="logistics-heading">Routes in motion</h2>
              </div>
              <Route size={22} />
            </div>

            <div className="route-list">
              {adminRoutes.map((route) => (
                <article className="route-item" key={route.route}>
                  <div className="route-icon">
                    <Truck size={20} />
                  </div>
                  <div>
                    <h3>{route.route}</h3>
                    <span>{route.driver}</span>
                  </div>
                  <div>
                    <strong>{route.lots}</strong>
                    <span>{route.temperature}</span>
                  </div>
                  <em>{route.status}</em>
                </article>
              ))}
            </div>
          </section>

          <aside className="panel messages-panel" aria-labelledby="messages-heading">
            <div className="panel-header">
              <div>
                <span>Alerts</span>
                <h2 id="messages-heading">Field updates</h2>
              </div>
              <MessageSquareText size={22} />
            </div>
            <div className="message-list">
              <span>
                <PackageCheck size={18} />
                Tomato lot AKL-882 passed weight check.
              </span>
              <span>
                <CalendarDays size={18} />
                Rangpur potato pickup moved to 8:20 PM.
              </span>
              <span>
                <UsersRound size={18} />
                4 new farmers awaiting verification.
              </span>
            </div>
          </aside>
        </section>
      </div>
    </section>
  );
}

function CropCard({ lot, onOrder }: { lot: CropLot; onOrder: () => void }) {
  return (
    <article className="crop-card">
      <img src={lot.image} alt={`${lot.crop} harvest`} />
      <div className="crop-card-body">
        <div className="crop-title-row">
          <div>
            <h2>{lot.crop}</h2>
            <p>{lot.farmer}</p>
          </div>
          <span>{lot.ask}</span>
        </div>
        <div className="crop-meta">
          <span><MapPin size={15} /> {lot.district}</span>
          <span><PackageCheck size={15} /> {lot.quantity}</span>
          <span><BadgeCheck size={15} /> Grade {lot.grade}</span>
          <span><CalendarDays size={15} /> {lot.harvest}</span>
        </div>
        <button className="order-button" type="button" onClick={onOrder}>Order this lot</button>
      </div>
    </article>
  );
}

function SectionTitle({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="section-title">
      <span>{eyebrow}</span>
      <h1>{title}</h1>
    </div>
  );
}

function FormGrid({ children }: { children: React.ReactNode }) {
  return <div className="form-grid">{children}</div>;
}

function Input({ label, placeholder }: { label: string; placeholder: string }) {
  return (
    <label className="input-field">
      <span>{label}</span>
      <input placeholder={placeholder} />
    </label>
  );
}

function StatCard({ icon: Icon, label, value, detail }: { icon: typeof Banknote; label: string; value: string; detail: string }) {
  return (
    <article className="stat-card">
      <Icon size={21} />
      <span>{label}</span>
      <strong>{value}</strong>
      <p>{detail}</p>
    </article>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
