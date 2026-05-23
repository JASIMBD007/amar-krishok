import React from "react";
import ReactDOM from "react-dom/client";
import {
  BadgeCheck,
  Banknote,
  Bell,
  Boxes,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ClipboardCheck,
  Clock3,
  Gauge,
  HandCoins,
  LayoutDashboard,
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
  TrendingDown,
  TrendingUp,
  Truck,
  UsersRound,
  WalletCards,
} from "lucide-react";
import "./styles.css";

type Stat = {
  label: string;
  value: string;
  detail: string;
  trend: "up" | "down" | "steady";
};

type Order = {
  id: string;
  buyer: string;
  crop: string;
  quantity: string;
  location: string;
  value: string;
  status: "Matching" | "Pickup booked" | "In transit" | "Quality check";
  eta: string;
};

type SupplyLot = {
  crop: string;
  farmer: string;
  district: string;
  quantity: string;
  ask: string;
  grade: string;
  readiness: string;
  image: string;
};

type PriceSignal = {
  crop: string;
  region: string;
  farmerAsk: number;
  wholesale: number;
  market: number;
};

type RouteItem = {
  route: string;
  driver: string;
  lots: string;
  status: string;
  temperature: string;
};

const stats: Stat[] = [
  {
    label: "GMV today",
    value: "৳4.82L",
    detail: "18 orders confirmed",
    trend: "up",
  },
  {
    label: "Farmer payout",
    value: "৳3.96L",
    detail: "৳82K pending escrow",
    trend: "up",
  },
  {
    label: "Active supply",
    value: "27.4 tons",
    detail: "63 verified lots",
    trend: "steady",
  },
  {
    label: "Avg price lift",
    value: "16.8%",
    detail: "vs local middleman rate",
    trend: "up",
  },
];

const orders: Order[] = [
  {
    id: "AK-2048",
    buyer: "Shwapno Retail",
    crop: "Tomato",
    quantity: "2.0 tons",
    location: "Dhaka North",
    value: "৳84,000",
    status: "Matching",
    eta: "3 farmer groups",
  },
  {
    id: "AK-2047",
    buyer: "Hotel Sarina",
    crop: "Green Chilli",
    quantity: "360 kg",
    location: "Banani",
    value: "৳34,920",
    status: "Pickup booked",
    eta: "Today 6:30 PM",
  },
  {
    id: "AK-2046",
    buyer: "Agora Warehouse",
    crop: "Potato",
    quantity: "4.5 tons",
    location: "Tejgaon",
    value: "৳1,21,500",
    status: "In transit",
    eta: "2 hr 10 min",
  },
  {
    id: "AK-2045",
    buyer: "B2B Kitchen Co.",
    crop: "Onion",
    quantity: "1.1 tons",
    location: "Mirpur",
    value: "৳81,400",
    status: "Quality check",
    eta: "Awaiting buyer",
  },
];

const supplyLots: SupplyLot[] = [
  {
    crop: "Tomato",
    farmer: "Mst. Rahima",
    district: "Jashore",
    quantity: "1.2 tons",
    ask: "৳34/kg",
    grade: "B+",
    readiness: "Ready tomorrow",
    image:
      "https://images.unsplash.com/photo-1592841200221-a6898f307baa?auto=format&fit=crop&w=500&q=80",
  },
  {
    crop: "Green Chilli",
    farmer: "Abdul Karim",
    district: "Bogura",
    quantity: "420 kg",
    ask: "৳86/kg",
    grade: "A",
    readiness: "Ready now",
    image:
      "https://images.unsplash.com/photo-1583119022894-919a68a3d0e3?auto=format&fit=crop&w=500&q=80",
  },
  {
    crop: "Potato",
    farmer: "Nayan Mondol",
    district: "Rangpur",
    quantity: "3.6 tons",
    ask: "৳21/kg",
    grade: "A",
    readiness: "Cold stored",
    image:
      "https://images.unsplash.com/photo-1518977676601-b53f82aba655?auto=format&fit=crop&w=500&q=80",
  },
];

const priceSignals: PriceSignal[] = [
  { crop: "Tomato", region: "Jashore", farmerAsk: 34, wholesale: 42, market: 48 },
  { crop: "Potato", region: "Rangpur", farmerAsk: 21, wholesale: 27, market: 32 },
  { crop: "Onion", region: "Pabna", farmerAsk: 63, wholesale: 74, market: 82 },
  { crop: "Chilli", region: "Bogura", farmerAsk: 86, wholesale: 98, market: 116 },
];

const routes: RouteItem[] = [
  {
    route: "Bogura - Dhaka",
    driver: "Hasan Logistics",
    lots: "3 lots / 1.1 tons",
    status: "Pickup in 42 min",
    temperature: "Ambient",
  },
  {
    route: "Rangpur - Tejgaon",
    driver: "North Cold Van",
    lots: "2 lots / 4.5 tons",
    status: "In transit",
    temperature: "8°C",
  },
  {
    route: "Jashore - Dhaka",
    driver: "Padma Cargo",
    lots: "4 lots / 2.8 tons",
    status: "Awaiting load",
    temperature: "Ambient",
  },
];

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard, active: true },
  { label: "Orders", icon: ShoppingBag },
  { label: "Supply Lots", icon: Boxes },
  { label: "Farmers", icon: UsersRound },
  { label: "Logistics", icon: Truck },
  { label: "Payouts", icon: WalletCards },
  { label: "Settings", icon: Settings },
];

function TrendIcon({ trend }: { trend: Stat["trend"] }) {
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
  return (
    <main className="dashboard-shell">
      <aside className="sidebar" aria-label="Dashboard navigation">
        <a className="brand" href="/" aria-label="AmarKrishok dashboard">
          <span className="brand-mark">
            <Sprout size={22} strokeWidth={2.6} />
          </span>
          <span>
            <strong>AmarKrishok</strong>
            <small>Supply command</small>
          </span>
        </a>

        <nav className="side-nav">
          {navItems.map((item) => {
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

      <section className="workspace">
        <header className="dashboard-topbar">
          <button className="mobile-menu" type="button" aria-label="Open navigation">
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
          {stats.map((stat) => (
            <article className="stat-card" key={stat.label}>
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
                        <span>{order.location}</span>
                      </td>
                      <td>{order.buyer}</td>
                      <td>{order.crop}</td>
                      <td>{order.quantity}</td>
                      <td>{order.value}</td>
                      <td>
                        <em className={`status ${statusClass(order.status)}`}>{order.status}</em>
                      </td>
                      <td>{order.eta}</td>
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
              {supplyLots.map((lot) => (
                <article className="supply-item" key={`${lot.crop}-${lot.farmer}`}>
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
                    <span>{lot.readiness}</span>
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
              {priceSignals.map((price) => (
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
              {routes.map((route) => (
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
      </section>
    </main>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
