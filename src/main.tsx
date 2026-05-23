import React from "react";
import ReactDOM from "react-dom/client";
import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  Bell,
  CalendarDays,
  ChevronDown,
  CircleDollarSign,
  ClipboardCheck,
  Clock3,
  Filter,
  Handshake,
  HeartHandshake,
  MapPin,
  Menu,
  MessageCircle,
  PackageCheck,
  Search,
  ShieldCheck,
  ShoppingBag,
  Sprout,
  Star,
  Truck,
  UsersRound,
  WalletCards,
} from "lucide-react";
import "./styles.css";

type CropListing = {
  crop: string;
  farmer: string;
  location: string;
  quantity: string;
  price: string;
  grade: string;
  harvest: string;
  image: string;
};

type MarketPrice = {
  item: string;
  region: string;
  wholesale: string;
  farmerAsk: string;
  change: string;
};

const listings: CropListing[] = [
  {
    crop: "Green Chilli",
    farmer: "Abdul Karim",
    location: "Bogura Sadar",
    quantity: "420 kg",
    price: "৳86/kg",
    grade: "Grade A",
    harvest: "Ready today",
    image:
      "https://images.unsplash.com/photo-1583119022894-919a68a3d0e3?auto=format&fit=crop&w=900&q=80",
  },
  {
    crop: "Tomato",
    farmer: "Mst. Rahima",
    location: "Jashore",
    quantity: "1.2 tons",
    price: "৳34/kg",
    grade: "Grade B+",
    harvest: "Tomorrow",
    image:
      "https://images.unsplash.com/photo-1592841200221-a6898f307baa?auto=format&fit=crop&w=900&q=80",
  },
  {
    crop: "Potato",
    farmer: "Nayan Mondol",
    location: "Rangpur",
    quantity: "3.6 tons",
    price: "৳21/kg",
    grade: "Grade A",
    harvest: "In storage",
    image:
      "https://images.unsplash.com/photo-1518977676601-b53f82aba655?auto=format&fit=crop&w=900&q=80",
  },
];

const marketPrices: MarketPrice[] = [
  {
    item: "Potato",
    region: "Rangpur",
    wholesale: "৳27/kg",
    farmerAsk: "৳21/kg",
    change: "+6%",
  },
  {
    item: "Tomato",
    region: "Jashore",
    wholesale: "৳42/kg",
    farmerAsk: "৳34/kg",
    change: "-3%",
  },
  {
    item: "Onion",
    region: "Pabna",
    wholesale: "৳74/kg",
    farmerAsk: "৳63/kg",
    change: "+11%",
  },
  {
    item: "Green Chilli",
    region: "Bogura",
    wholesale: "৳98/kg",
    farmerAsk: "৳86/kg",
    change: "+18%",
  },
];

const steps = [
  {
    icon: Sprout,
    title: "Farmer lists crop",
    text: "Quantity, grade, harvest date, and expected fair price.",
  },
  {
    icon: Handshake,
    title: "Buyer confirms deal",
    text: "Retailer, restaurant, or wholesaler orders directly.",
  },
  {
    icon: Truck,
    title: "Logistics picks up",
    text: "Verified transport partners handle route and delivery.",
  },
  {
    icon: WalletCards,
    title: "Escrow releases pay",
    text: "Farmer gets paid after delivery and quality confirmation.",
  },
];

function App() {
  return (
    <main className="app-shell">
      <nav className="topbar" aria-label="Main navigation">
        <a className="brand" href="#top" aria-label="AmarKrishok home">
          <span className="brand-mark">
            <Sprout size={22} strokeWidth={2.6} />
          </span>
          <span>
            <strong>AmarKrishok</strong>
            <small>Fair farm trade</small>
          </span>
        </a>

        <div className="nav-links" aria-label="Sections">
          <a href="#market">Market</a>
          <a href="#prices">Prices</a>
          <a href="#logistics">Logistics</a>
          <a href="#trust">Trust</a>
        </div>

        <div className="nav-actions">
          <button className="icon-button" type="button" aria-label="Notifications">
            <Bell size={19} />
          </button>
          <button className="secondary-button" type="button">
            <MessageCircle size={18} />
            Support
          </button>
          <button className="menu-button" type="button" aria-label="Open menu">
            <Menu size={22} />
          </button>
        </div>
      </nav>

      <section className="hero-section" id="top">
        <div className="hero-copy">
          <div className="status-pill">
            <ShieldCheck size={16} />
            Verified farmer-to-buyer marketplace
          </div>
          <h1>AmarKrishok brings fair crop prices from field to market.</h1>
          <p>
            A direct supply-chain platform for Bangladesh where farmers post
            harvests, buyers order transparently, logistics partners deliver,
            and payments stay protected.
          </p>
          <div className="hero-actions">
            <button className="primary-button" type="button">
              Browse crops
              <ArrowRight size={19} />
            </button>
            <button className="secondary-button large" type="button">
              <CircleDollarSign size={19} />
              View live prices
            </button>
          </div>
        </div>

        <div className="market-console" id="market">
          <div className="console-header">
            <div>
              <span>Today&apos;s supply</span>
              <strong>Bogura - Jashore - Rangpur</strong>
            </div>
            <button className="icon-button" type="button" aria-label="Filter listings">
              <Filter size={18} />
            </button>
          </div>

          <div className="search-box">
            <Search size={18} />
            <input aria-label="Search crops" value="Search tomato, potato, chilli..." readOnly />
            <button type="button">
              District
              <ChevronDown size={16} />
            </button>
          </div>

          <div className="listing-grid">
            {listings.map((listing) => (
              <article className="crop-card" key={listing.crop}>
                <img src={listing.image} alt={`${listing.crop} harvest`} />
                <div className="crop-card-body">
                  <div className="crop-title-row">
                    <div>
                      <h2>{listing.crop}</h2>
                      <p>{listing.farmer}</p>
                    </div>
                    <span>{listing.price}</span>
                  </div>
                  <div className="crop-meta">
                    <span>
                      <MapPin size={15} />
                      {listing.location}
                    </span>
                    <span>
                      <PackageCheck size={15} />
                      {listing.quantity}
                    </span>
                    <span>
                      <BadgeCheck size={15} />
                      {listing.grade}
                    </span>
                    <span>
                      <CalendarDays size={15} />
                      {listing.harvest}
                    </span>
                  </div>
                  <button className="order-button" type="button">
                    Reserve lot
                  </button>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="metrics-band" aria-label="Platform metrics">
        <div>
          <strong>18%</strong>
          <span>average farmer price lift</span>
        </div>
        <div>
          <strong>42 min</strong>
          <span>typical buyer response</span>
        </div>
        <div>
          <strong>96%</strong>
          <span>verified delivery completion</span>
        </div>
        <div>
          <strong>৳12.8m</strong>
          <span>protected escrow volume</span>
        </div>
      </section>

      <section className="section-grid" id="prices">
        <div className="section-heading">
          <span>Live pricing</span>
          <h2>Transparent prices before anyone bargains.</h2>
          <p>
            Farmers and buyers see the same district-level wholesale signal,
            farmer asking price, and trend movement before placing an order.
          </p>
        </div>

        <div className="price-panel">
          <div className="panel-title">
            <BarChart3 size={20} />
            <strong>Market price board</strong>
          </div>
          {marketPrices.map((price) => (
            <div className="price-row" key={price.item}>
              <div>
                <strong>{price.item}</strong>
                <span>{price.region}</span>
              </div>
              <div>
                <span>Wholesale</span>
                <strong>{price.wholesale}</strong>
              </div>
              <div>
                <span>Farmer ask</span>
                <strong>{price.farmerAsk}</strong>
              </div>
              <em>{price.change}</em>
            </div>
          ))}
        </div>
      </section>

      <section className="workflow-section" id="logistics">
        <div className="section-heading compact">
          <span>Operating model</span>
          <h2>Built around the parts that usually break.</h2>
        </div>

        <div className="workflow-grid">
          {steps.map((step) => {
            const Icon = step.icon;
            return (
              <article className="workflow-card" key={step.title}>
                <Icon size={23} />
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="trust-section" id="trust">
        <div className="trust-panel">
          <div className="section-heading">
            <span>Trust layer</span>
            <h2>Quality, payment, and delivery stay visible.</h2>
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
          <div className="buyer-stats">
            <span>
              <Star size={15} />
              4.9 buyer rating
            </span>
            <span>
              <UsersRound size={15} />
              6 farmers matched
            </span>
          </div>
          <button className="primary-button full" type="button">
            Match farmers
          </button>
        </aside>
      </section>
    </main>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
