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
type Language = "en" | "bn";

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

const bn: Record<string, string> = {
  Home: "হোম",
  Marketplace: "বাজার",
  "Post Crop": "ফসল পোস্ট",
  Order: "অর্ডার",
  Prices: "বাজারদর",
  Admin: "অ্যাডমিন",
  "Direct from Farmer, Fair for All": "কৃষকের কাছ থেকে সরাসরি, সবার জন্য ন্যায্য",
  Notifications: "নোটিফিকেশন",
  "Logged in": "লগইন করা",
  Login: "লগইন",
  "Verified farmer-to-buyer marketplace": "যাচাইকৃত কৃষক-থেকে-ক্রেতা বাজার",
  "Farmers post crops. Buyers order directly. Admins manage the chain.": "কৃষক ফসল পোস্ট করবে। ক্রেতা সরাসরি অর্ডার দেবে। অ্যাডমিন সাপ্লাই চেইন পরিচালনা করবে।",
  "A direct supply-chain platform for Bangladesh where farmers post harvests, buyers order transparently, logistics partners deliver, and payments stay protected.": "বাংলাদেশের জন্য একটি সরাসরি সাপ্লাই-চেইন প্ল্যাটফর্ম, যেখানে কৃষক ফসল পোস্ট করেন, ক্রেতা স্বচ্ছভাবে অর্ডার দেন, লজিস্টিকস পার্টনার ডেলিভারি করে, এবং পেমেন্ট সুরক্ষিত থাকে।",
  "Browse crops": "ফসল দেখুন",
  "Post a crop": "ফসল পোস্ট করুন",
  "Today's supply": "আজকের সরবরাহ",
  "Live lots from verified farmers": "যাচাইকৃত কৃষকদের লাইভ ফসল",
  "active verified supply": "সক্রিয় যাচাইকৃত সরবরাহ",
  "orders confirmed today": "আজ নিশ্চিত অর্ডার",
  "average farmer price lift": "কৃষকের গড় মূল্য বৃদ্ধি",
  "escrow pending release": "এসক্রো ছাড়ের অপেক্ষায়",
  "Farmer posts crop": "কৃষক ফসল পোস্ট করে",
  "Crop, district, quantity, grade, harvest date, and asking price.": "ফসল, জেলা, পরিমাণ, গ্রেড, সংগ্রহের তারিখ ও প্রত্যাশিত দাম।",
  "Buyer orders": "ক্রেতা অর্ডার দেয়",
  "Retailers and restaurants reserve lots or request bulk supply.": "রিটেইলার ও রেস্টুরেন্ট ফসল বুক করে বা bulk supply চায়।",
  "Logistics runs": "লজিস্টিকস পরিচালিত হয়",
  "Pickup, delivery, and proof stay visible to all parties.": "পিকআপ, ডেলিভারি ও প্রমাণ সব পক্ষ দেখতে পারে।",
  "Admin releases payout": "অ্যাডমিন পেমেন্ট ছাড়ে",
  "Escrow protects buyers and pays farmers after confirmation.": "এসক্রো ক্রেতাকে সুরক্ষা দেয় এবং নিশ্চিতকরণের পর কৃষককে পেমেন্ট করে।",
  "Trust layer": "বিশ্বাস স্তর",
  "Quality, payment, and delivery stay visible.": "গুণমান, পেমেন্ট ও ডেলিভারি দৃশ্যমান থাকে।",
  "AmarKrishok reduces middleman abuse by keeping lot grading, escrow status, buyer history, and delivery proof in one shared record.": "AmarKrishok ফসলের গ্রেডিং, এসক্রো স্ট্যাটাস, ক্রেতার ইতিহাস ও ডেলিভারি প্রমাণ এক জায়গায় রেখে মধ্যস্বত্বভোগীর অপব্যবহার কমায়।",
  "Digital quality checklist before pickup": "পিকআপের আগে ডিজিটাল গুণমান চেকলিস্ট",
  "Delivery milestones with buyer confirmation": "ক্রেতার নিশ্চিতকরণসহ ডেলিভারি ধাপ",
  "Farmer co-op groups for bulk orders": "বড় অর্ডারের জন্য কৃষক সমবায় গ্রুপ",
  "Buyer request": "ক্রেতার চাহিদা",
  "Need 2 tons tomato for Dhaka retail chain": "ঢাকার রিটেইল চেইনের জন্য ২ টন টমেটো দরকার",
  "Preferred delivery: next morning. Escrow ready after lot approval.": "পছন্দের ডেলিভারি: পরের সকাল। ফসল অনুমোদনের পর এসক্রো প্রস্তুত।",
  "Match farmers": "কৃষক মিলান",
  "Search crops by location and reserve directly from farmers.": "লোকেশন অনুযায়ী ফসল খুঁজুন এবং কৃষকের কাছ থেকে সরাসরি বুক করুন।",
  "Search tomato, potato, farmer...": "টমেটো, আলু, কৃষক খুঁজুন...",
  "All districts": "সব জেলা",
  Jashore: "যশোর",
  Bogura: "বগুড়া",
  Rangpur: "রংপুর",
  Pabna: "পাবনা",
  Tomato: "টমেটো",
  "Green Chilli": "কাঁচা মরিচ",
  Potato: "আলু",
  Onion: "পেঁয়াজ",
  Chilli: "মরিচ",
  "Post a crop lot for direct buyer orders.": "সরাসরি ক্রেতার অর্ডারের জন্য ফসলের লট পোস্ট করুন।",
  "Farmer app": "কৃষক অ্যাপ",
  "Crop name": "ফসলের নাম",
  District: "জেলা",
  Quantity: "পরিমাণ",
  "Expected price": "প্রত্যাশিত দাম",
  "Harvest date": "সংগ্রহের তারিখ",
  Grade: "গ্রেড",
  Notes: "নোট",
  "Tomorrow morning": "আগামীকাল সকাল",
  "Packaging, pickup point, storage condition...": "প্যাকেজিং, পিকআপ পয়েন্ট, সংরক্ষণ অবস্থা...",
  "Publish crop lot": "ফসলের লট প্রকাশ করুন",
  "Farmer profile readiness": "কৃষকের প্রোফাইল প্রস্তুতি",
  "Phone OTP, NID, farm location, and bank/mobile wallet details should be verified before payout.": "পেমেন্টের আগে ফোন OTP, NID, খামারের লোকেশন ও ব্যাংক/মোবাইল ওয়ালেট তথ্য যাচাই করা উচিত।",
  "Phone verified": "ফোন যাচাই হয়েছে",
  "Farm location added": "খামারের লোকেশন যোগ হয়েছে",
  "Wallet verification pending": "ওয়ালেট যাচাই বাকি",
  "Buyer order": "ক্রেতার অর্ডার",
  "Place a direct order or bulk request.": "সরাসরি অর্ডার বা bulk request দিন।",
  "Buyer name": "ক্রেতার নাম",
  "Restaurant / retailer / family group": "রেস্টুরেন্ট / রিটেইলার / পরিবার গ্রুপ",
  "Crop needed": "যে ফসল দরকার",
  "Delivery area": "ডেলিভারি এলাকা",
  "Target date": "লক্ষ্য তারিখ",
  "Tomorrow 8 AM": "আগামীকাল সকাল ৮টা",
  "Offer price": "অফার দাম",
  "Quality requirement": "গুণমানের চাহিদা",
  "Grade, packaging, ripeness, delivery notes...": "গ্রেড, প্যাকেজিং, পাকা অবস্থা, ডেলিভারি নোট...",
  "Submit order request": "অর্ডার রিকোয়েস্ট জমা দিন",
  "Matched supply": "মিল পাওয়া সরবরাহ",
  "Current best match: 3 verified tomato lots from Jashore, total 2.9 tons.": "বর্তমান সেরা মিল: যশোরের ৩টি যাচাইকৃত টমেটো লট, মোট ২.৯ টন।",
  "View matched lots": "মিল পাওয়া লট দেখুন",
  "Market prices": "বাজারদর",
  "Daily farmer, wholesale, and retail price signals.": "দৈনিক কৃষক, পাইকারি ও খুচরা দামের সংকেত।",
  "Farmer ask": "কৃষকের দাম",
  Wholesale: "পাইকারি",
  Retail: "খুচরা",
  "Admin Control": "অ্যাডমিন কন্ট্রোল",
  "Supply command": "সরবরাহ নিয়ন্ত্রণ",
  Dashboard: "ড্যাশবোর্ড",
  Orders: "অর্ডার",
  "Supply Lots": "সরবরাহ লট",
  Farmers: "কৃষক",
  Logistics: "লজিস্টিকস",
  Payouts: "পেমেন্ট",
  Settings: "সেটিংস",
  "Escrow protected": "এসক্রো সুরক্ষিত",
  "৳82,000 ready for farmer release after buyer confirmation.": "ক্রেতার নিশ্চিতকরণের পর কৃষককে ছাড়ার জন্য ৳৮২,০০০ প্রস্তুত।",
  "Sunday, May 24": "রবিবার, ২৪ মে",
  "Operations dashboard": "অপারেশন ড্যাশবোর্ড",
  "Search order, farmer, district...": "অর্ডার, কৃষক, জেলা খুঁজুন...",
  "New lot": "নতুন লট",
  "GMV today": "আজকের GMV",
  "18 orders confirmed": "১৮টি অর্ডার নিশ্চিত",
  "Farmer payout": "কৃষকের পেমেন্ট",
  "৳82K pending escrow": "৳৮২K এসক্রো অপেক্ষমাণ",
  "Active supply": "সক্রিয় সরবরাহ",
  "63 verified lots": "৬৩টি যাচাইকৃত লট",
  "Avg price lift": "গড় মূল্য বৃদ্ধি",
  "vs local middleman rate": "স্থানীয় দালালের দামের তুলনায়",
  "Order control": "অর্ডার নিয়ন্ত্রণ",
  "Buyer demand queue": "ক্রেতার চাহিদা তালিকা",
  "All orders": "সব অর্ডার",
  Buyer: "ক্রেতা",
  Crop: "ফসল",
  Value: "মূল্য",
  Status: "স্ট্যাটাস",
  "Matching": "মিল খোঁজা হচ্ছে",
  "Pickup booked": "পিকআপ বুকড",
  "In transit": "পথে আছে",
  "Quality check": "গুণমান যাচাই",
  "3 farmer groups": "৩টি কৃষক গ্রুপ",
  Today: "আজ",
  "Payout action": "পেমেন্ট কার্যক্রম",
  "Release queue": "ছাড়ের তালিকা",
  "Ready after QC": "QC-এর পরে প্রস্তুত",
  "Delivery photo received": "ডেলিভারি ছবি পাওয়া গেছে",
  "Buyer weight confirmed": "ক্রেতা ওজন নিশ্চিত করেছে",
  "Quality check pending": "গুণমান যাচাই বাকি",
  "Review payouts": "পেমেন্ট রিভিউ করুন",
  "Farmer supply": "কৃষক সরবরাহ",
  "Verified lots": "যাচাইকৃত লট",
  "Grade lots": "লট গ্রেড করুন",
  "Price intelligence": "দাম বিশ্লেষণ",
  "Farmer vs market spread": "কৃষক বনাম বাজার দামের পার্থক্য",
  "Logistics board": "লজিস্টিকস বোর্ড",
  "Routes in motion": "চলমান রুট",
  Alerts: "অ্যালার্ট",
  "Field updates": "মাঠের আপডেট",
  "Tomato lot AKL-882 passed weight check.": "টমেটো লট AKL-882 ওজন পরীক্ষায় পাস করেছে।",
  "Rangpur potato pickup moved to 8:20 PM.": "রংপুর আলুর পিকআপ রাত ৮:২০-এ সরানো হয়েছে।",
  "4 new farmers awaiting verification.": "৪ জন নতুন কৃষক যাচাইয়ের অপেক্ষায়।",
  "Order this lot": "এই লট অর্ডার করুন",
  "Ready tomorrow": "আগামীকাল প্রস্তুত",
  "Ready today": "আজ প্রস্তুত",
  "Cold stored": "কোল্ড স্টোরে আছে",
  "Ready in 2 days": "২ দিনে প্রস্তুত",
  "1.2 tons": "১.২ টন",
  "420 kg": "৪২০ কেজি",
  "3.6 tons": "৩.৬ টন",
  "1.8 tons": "১.৮ টন",
  "2.0 tons": "২.০ টন",
  "360 kg": "৩৬০ কেজি",
  "4.5 tons": "৪.৫ টন",
  "1.1 tons": "১.১ টন",
  "Dhaka North": "ঢাকা উত্তর",
  Banani: "বনানী",
  Tejgaon: "তেজগাঁও",
  Mirpur: "মিরপুর",
  "Shwapno Retail": "স্বপ্ন রিটেইল",
  "Hotel Sarina": "হোটেল সারিনা",
  "Agora Warehouse": "আগোরা ওয়্যারহাউস",
  "B2B Kitchen Co.": "B2B কিচেন কো.",
  "Mst. Rahima": "মোছা. রহিমা",
  "Abdul Karim": "আব্দুল করিম",
  "Nayan Mondol": "নয়ন মণ্ডল",
  "Rashed Mia": "রাশেদ মিয়া",
  "Bogura - Dhaka": "বগুড়া - ঢাকা",
  "Rangpur - Tejgaon": "রংপুর - তেজগাঁও",
  "Jashore - Dhaka": "যশোর - ঢাকা",
  "Hasan Logistics": "হাসান লজিস্টিকস",
  "North Cold Van": "নর্থ কোল্ড ভ্যান",
  "Padma Cargo": "পদ্মা কার্গো",
  "3 lots / 1.1 tons": "৩ লট / ১.১ টন",
  "2 lots / 4.5 tons": "২ লট / ৪.৫ টন",
  "4 lots / 2.8 tons": "৪ লট / ২.৮ টন",
  "Pickup in 42 min": "৪২ মিনিটে পিকআপ",
  Ambient: "সাধারণ তাপমাত্রা",
  "8°C": "৮°C",
  "Awaiting load": "লোডের অপেক্ষায়",
};

const LanguageContext = React.createContext<Language>("en");

function translate(language: Language, text: string) {
  return language === "bn" ? bn[text] ?? text : text;
}

function useTranslate() {
  const language = React.useContext(LanguageContext);
  return (text: string) => translate(language, text);
}

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
  const [language, setLanguage] = useState<Language>("en");
  const t = (text: string) => translate(language, text);

  const filteredLots = useMemo(() => {
    return lots.filter((lot) => {
      const haystack = `${lot.crop} ${lot.farmer} ${lot.district} ${t(lot.crop)} ${t(lot.farmer)} ${t(lot.district)}`;
      const textMatch = haystack.toLowerCase().includes(query.toLowerCase());
      const districtMatch = district === "All districts" || lot.district === district;
      return textMatch && districtMatch;
    });
  }, [query, district, language]);

  const selectView = (nextView: View) => {
    setView(nextView);
    setMenuOpen(false);
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
        <button className="brand" type="button" onClick={() => selectView("home")} aria-label="AmarKrishok home">
          <span className="brand-mark">
            <Sprout size={22} strokeWidth={2.6} />
          </span>
          <span>
            <strong>AmarKrishok</strong>
            <small>{t("Direct from Farmer, Fair for All")}</small>
          </span>
        </button>

        <nav className="main-nav" aria-label={t("Main navigation")}>
          {views.map((item) => (
            <button className={view === item.id ? "active" : ""} key={item.id} type="button" onClick={() => selectView(item.id)}>
              {t(item.label)}
            </button>
          ))}
        </nav>

        <div className="header-actions">
          <div className="language-switch" aria-label="Language switch">
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
          <button className="secondary-button" type="button" onClick={() => setLoggedIn((value) => !value)}>
            <LockKeyhole size={17} />
            {loggedIn ? t("Logged in") : t("Login")}
          </button>
        </div>

        {menuOpen && (
          <nav className="mobile-menu-panel" aria-label={t("Mobile navigation")}>
            {views.map((item) => (
              <button className={view === item.id ? "active" : ""} key={item.id} type="button" onClick={() => selectView(item.id)}>
                {t(item.label)}
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
    </LanguageContext.Provider>
  );
}

function HomeView({ setView }: { setView: (view: View) => void }) {
  const t = useTranslate();
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
              <CropCard lot={lot} key={lot.id} onOrder={() => setView("buyer")} />
            ))}
          </div>
        </div>
      </section>

      <section className="metrics-band" aria-label="Platform metrics">
        <div>
          <strong>27.4 tons</strong>
          <span>{t("active verified supply")}</span>
        </div>
        <div>
          <strong>18</strong>
          <span>{t("orders confirmed today")}</span>
        </div>
        <div>
          <strong>16.8%</strong>
          <span>{t("average farmer price lift")}</span>
        </div>
        <div>
          <strong>৳82K</strong>
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

        <aside className="buyer-card" aria-label="Buyer request">
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
  const t = useTranslate();
  return (
    <section className="page-wrap">
      <SectionTitle eyebrow="Marketplace" title="Search crops by location and reserve directly from farmers." />
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
  const t = useTranslate();
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

function BuyerView() {
  const t = useTranslate();
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

function PricesView() {
  const t = useTranslate();
  return (
    <section className="page-wrap">
      <SectionTitle eyebrow="Market prices" title="Daily farmer, wholesale, and retail price signals." />
      <div className="price-table panel">
        {prices.map((price) => (
          <div className="price-row" key={`${price.crop}-${price.district}`}>
            <div>
              <strong>{t(price.crop)}</strong>
              <span>{t(price.district)}</span>
            </div>
            <div>
              <span>{t("Farmer ask")}</span>
              <strong>{price.farmerAsk}/kg</strong>
            </div>
            <div>
              <span>{t("Wholesale")}</span>
              <strong>{price.wholesale}/kg</strong>
            </div>
            <div>
              <span>{t("Retail")}</span>
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
  const t = useTranslate();
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

        <nav className="side-nav">
          {adminNavItems.map((item) => {
            const Icon = item.icon;
            return (
              <button className={item.active ? "active" : ""} type="button" key={item.label}>
                <Icon size={19} />
                {t(item.label)}
              </button>
            );
          })}
        </nav>

        <div className="trust-summary">
          <ShieldCheck size={22} />
          <strong>{t("Escrow protected")}</strong>
          <span>{t("৳82,000 ready for farmer release after buyer confirmation.")}</span>
        </div>
      </aside>

      <div className="workspace dashboard-workspace">
        <header className="dashboard-topbar">
          <button className="mobile-menu" type="button" aria-label={t("Open admin navigation")}>
            <Menu size={22} />
          </button>

          <div className="page-title">
            <span>{t("Sunday, May 24")}</span>
            <h1>{t("Operations dashboard")}</h1>
          </div>

          <div className="topbar-actions">
            <label className="global-search">
              <Search size={18} />
              <input value={t("Search order, farmer, district...")} readOnly aria-label={t("Search dashboard")} />
            </label>
            <button className="icon-button" type="button" aria-label={t("Notifications")}>
              <Bell size={19} />
            </button>
            <button className="primary-button" type="button">
              <Plus size={18} />
              {t("New lot")}
            </button>
          </div>
        </header>

        <section className="stats-grid" aria-label="Business metrics">
          {dashboardStats.map((stat) => (
            <article className="stat-card dashboard-stat" key={stat.label}>
              <div className={`trend ${stat.trend}`}>
                <TrendIcon trend={stat.trend} />
              </div>
              <span>{t(stat.label)}</span>
              <strong>{stat.value}</strong>
              <p>{t(stat.detail)}</p>
            </article>
          ))}
        </section>

        <section className="dashboard-grid">
          <section className="panel orders-panel" aria-labelledby="orders-heading">
            <div className="panel-header">
              <div>
                <span>{t("Order control")}</span>
                <h2 id="orders-heading">{t("Buyer demand queue")}</h2>
              </div>
              <button className="secondary-button" type="button">
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
                    <th>ETA</th>
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
                      <td>{order.value}</td>
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

          <aside className="panel action-panel" aria-labelledby="release-heading">
            <div className="panel-header">
              <div>
                <span>{t("Payout action")}</span>
                <h2 id="release-heading">{t("Release queue")}</h2>
              </div>
              <HandCoins size={22} />
            </div>
            <div className="release-amount">
              <span>{t("Ready after QC")}</span>
              <strong>৳82,000</strong>
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
            <button className="primary-button full" type="button">
              {t("Review payouts")}
            </button>
          </aside>

          <section className="panel supply-panel" aria-labelledby="supply-heading">
            <div className="panel-header">
              <div>
                <span>{t("Farmer supply")}</span>
                <h2 id="supply-heading">{t("Verified lots")}</h2>
              </div>
              <button className="secondary-button" type="button">
                <ClipboardCheck size={17} />
                {t("Grade lots")}
              </button>
            </div>

            <div className="supply-list">
              {lots.slice(0, 3).map((lot) => (
                <article className="supply-item" key={lot.id}>
                  <img src={lot.image} alt={`${t(lot.crop)} supply`} />
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
                    <span>{lot.ask}</span>
                  </div>
                  <div>
                    <strong>{t("Grade")} {lot.grade}</strong>
                    <span>{t(lot.harvest)}</span>
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
                {t("Farmer ask")}
              </span>
              <span>
                <i className="wholesale" />
                {t("Wholesale")}
              </span>
            </div>
          </section>

          <section className="panel logistics-panel" aria-labelledby="logistics-heading">
            <div className="panel-header">
              <div>
                <span>{t("Logistics board")}</span>
                <h2 id="logistics-heading">{t("Routes in motion")}</h2>
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
        </section>
      </div>
    </section>
  );
}

function CropCard({ lot, onOrder }: { lot: CropLot; onOrder: () => void }) {
  const t = useTranslate();
  return (
    <article className="crop-card">
      <img src={lot.image} alt={`${t(lot.crop)} harvest`} />
      <div className="crop-card-body">
        <div className="crop-title-row">
          <div>
            <h2>{t(lot.crop)}</h2>
            <p>{t(lot.farmer)}</p>
          </div>
          <span>{lot.ask}</span>
        </div>
        <div className="crop-meta">
          <span><MapPin size={15} /> {t(lot.district)}</span>
          <span><PackageCheck size={15} /> {t(lot.quantity)}</span>
          <span><BadgeCheck size={15} /> {t("Grade")} {lot.grade}</span>
          <span><CalendarDays size={15} /> {t(lot.harvest)}</span>
        </div>
        <button className="order-button" type="button" onClick={onOrder}>{t("Order this lot")}</button>
      </div>
    </article>
  );
}

function SectionTitle({ eyebrow, title }: { eyebrow: string; title: string }) {
  const t = useTranslate();
  return (
    <div className="section-title">
      <span>{t(eyebrow)}</span>
      <h1>{t(title)}</h1>
    </div>
  );
}

function FormGrid({ children }: { children: React.ReactNode }) {
  return <div className="form-grid">{children}</div>;
}

function Input({ label, placeholder }: { label: string; placeholder: string }) {
  const t = useTranslate();
  return (
    <label className="input-field">
      <span>{t(label)}</span>
      <input placeholder={t(placeholder)} />
    </label>
  );
}

function StatCard({ icon: Icon, label, value, detail }: { icon: typeof Banknote; label: string; value: string; detail: string }) {
  const t = useTranslate();
  return (
    <article className="stat-card">
      <Icon size={21} />
      <span>{t(label)}</span>
      <strong>{value}</strong>
      <p>{t(detail)}</p>
    </article>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
