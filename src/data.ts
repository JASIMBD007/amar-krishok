import { LayoutDashboard, Settings, ShoppingBag, Sprout, Truck, UsersRound, WalletCards } from "lucide-react";
import type {
  AdminPriceSignal,
  AdminRoute,
  AdminSection,
  CropLot,
  DashboardStat,
  MarketPrice,
  Order,
  Role,
  View,
} from "./types";

export const lots: CropLot[] = [
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
    image: "/assets/crops/green-chilli.jpg",
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
    image: "/assets/crops/onion.jpg",
  },
  {
    id: "LOT-418",
    crop: "Rice",
    farmer: "Selim Hossain",
    district: "Kushtia",
    quantity: "2.4 tons",
    ask: "৳38/kg",
    grade: "A",
    harvest: "Ready tomorrow",
    image: "/assets/crops/rice.png",
  },
  {
    id: "LOT-386",
    crop: "Eggplant",
    farmer: "Fatema Khatun",
    district: "Kushtia",
    quantity: "680 kg",
    ask: "৳29/kg",
    grade: "B+",
    harvest: "Ready today",
    image: "/assets/crops/eggplant.jpg",
  },
  {
    id: "LOT-274",
    crop: "Cucumber",
    farmer: "Mizanur Rahman",
    district: "Bogura",
    quantity: "1.5 tons",
    ask: "৳24/kg",
    grade: "A-",
    harvest: "Ready in 2 days",
    image:
      "https://images.unsplash.com/photo-1449300079323-02e209d9d3a6?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "LOT-193",
    crop: "Mango",
    farmer: "Hasina Begum",
    district: "Rangpur",
    quantity: "950 kg",
    ask: "৳72/kg",
    grade: "A",
    harvest: "Ready tomorrow",
    image: "/assets/crops/mango.jpg",
  },
];

export const prices: MarketPrice[] = [
  { crop: "Tomato", district: "Jashore", farmerAsk: "৳34", wholesale: "৳42", retail: "৳48", trend: "+8%" },
  { crop: "Potato", district: "Rangpur", farmerAsk: "৳21", wholesale: "৳27", retail: "৳32", trend: "+6%" },
  { crop: "Onion", district: "Pabna", farmerAsk: "৳63", wholesale: "৳74", retail: "৳82", trend: "+11%" },
  { crop: "Chilli", district: "Bogura", farmerAsk: "৳86", wholesale: "৳98", retail: "৳116", trend: "+18%" },
  { crop: "Rice", district: "Kushtia", farmerAsk: "৳38", wholesale: "৳44", retail: "৳51", trend: "+9%" },
  { crop: "Eggplant", district: "Kushtia", farmerAsk: "৳29", wholesale: "৳36", retail: "৳44", trend: "+12%" },
  { crop: "Cucumber", district: "Bogura", farmerAsk: "৳24", wholesale: "৳31", retail: "৳38", trend: "+10%" },
  { crop: "Mango", district: "Rangpur", farmerAsk: "৳72", wholesale: "৳86", retail: "৳105", trend: "+15%" },
];

export const orders: Order[] = [
  { id: "AK-2048", buyer: "Shwapno Retail", crop: "Tomato", quantity: "2.0 tons", destination: "Dhaka North", value: "৳84,000", status: "Matching" },
  { id: "AK-2047", buyer: "Hotel Sarina", crop: "Green Chilli", quantity: "360 kg", destination: "Banani", value: "৳34,920", status: "Pickup booked" },
  { id: "AK-2046", buyer: "Agora Warehouse", crop: "Potato", quantity: "4.5 tons", destination: "Tejgaon", value: "৳1,21,500", status: "In transit" },
  { id: "AK-2045", buyer: "B2B Kitchen Co.", crop: "Onion", quantity: "1.1 tons", destination: "Mirpur", value: "৳81,400", status: "Quality check" },
];

export const views: Array<{ id: View; label: string; path: string }> = [
  { id: "home", label: "Home", path: "/" },
  { id: "market", label: "Marketplace", path: "/marketplace" },
  { id: "farmer", label: "Post Crop", path: "/farmer" },
  { id: "buyer", label: "Order", path: "/buyer" },
  { id: "prices", label: "Prices", path: "/prices" },
  { id: "admin", label: "Admin", path: "/admin" },
];

export const routeByView = views.reduce<Record<View, string>>((routes, item) => {
  routes[item.id] = item.path;
  return routes;
}, {} as Record<View, string>);

export const roleOptions: Array<{ role: Role; label: string; detail: string; view: View; icon: typeof LayoutDashboard }> = [
  { role: "admin", label: "Admin", detail: "Admin account", view: "admin", icon: LayoutDashboard },
  { role: "buyer", label: "Buyer", detail: "Buyer account", view: "buyer", icon: ShoppingBag },
  { role: "farmer", label: "Seller / Farmer", detail: "Farmer app", view: "farmer", icon: Sprout },
];

export const roleHomePath: Record<Role, string> = {
  admin: "/admin",
  buyer: "/buyer",
  farmer: "/farmer",
};

export const dashboardStats: DashboardStat[] = [
  { label: "GMV today", value: "৳4.82L", detail: "18 orders confirmed", trend: "up" },
  { label: "Farmer payout", value: "৳3.96L", detail: "৳82K pending escrow", trend: "up" },
  { label: "Active supply", value: "34.1 tons", detail: "78 verified lots", trend: "steady" },
  { label: "Avg price lift", value: "16.8%", detail: "vs local middleman rate", trend: "up" },
];

export const adminRoutes: AdminRoute[] = [
  { route: "Bogura - Dhaka", driver: "Hasan Logistics", lots: "3 lots / 1.1 tons", status: "Pickup in 42 min", temperature: "Ambient" },
  { route: "Rangpur - Tejgaon", driver: "North Cold Van", lots: "2 lots / 4.5 tons", status: "In transit", temperature: "8°C" },
  { route: "Jashore - Dhaka", driver: "Padma Cargo", lots: "4 lots / 2.8 tons", status: "Awaiting load", temperature: "Ambient" },
  { route: "Kushtia - Dhaka", driver: "Padma Cargo", lots: "5 lots / 3.4 tons", status: "Awaiting load", temperature: "Ambient" },
];

export const adminPriceSignals: AdminPriceSignal[] = [
  { crop: "Tomato", region: "Jashore", farmerAsk: 34, wholesale: 42, market: 48 },
  { crop: "Potato", region: "Rangpur", farmerAsk: 21, wholesale: 27, market: 32 },
  { crop: "Onion", region: "Pabna", farmerAsk: 63, wholesale: 74, market: 82 },
  { crop: "Chilli", region: "Bogura", farmerAsk: 86, wholesale: 98, market: 116 },
  { crop: "Rice", region: "Kushtia", farmerAsk: 38, wholesale: 44, market: 51 },
  { crop: "Eggplant", region: "Kushtia", farmerAsk: 29, wholesale: 36, market: 44 },
  { crop: "Cucumber", region: "Bogura", farmerAsk: 24, wholesale: 31, market: 38 },
  { crop: "Mango", region: "Rangpur", farmerAsk: 72, wholesale: 86, market: 105 },
];

export const adminNavItems: Array<{ id: AdminSection; label: string; icon: typeof LayoutDashboard }> = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "orders", label: "Orders", icon: ShoppingBag },
  { id: "supply", label: "Supply Lots", icon: Sprout },
  { id: "farmers", label: "Farmers", icon: UsersRound },
  { id: "logistics", label: "Logistics", icon: Truck },
  { id: "payouts", label: "Payouts", icon: WalletCards },
  { id: "settings", label: "Settings", icon: Settings },
];
