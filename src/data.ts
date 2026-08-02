import { BarChart3, LayoutDashboard, MessageSquareText, Settings, ShoppingBag, Sprout, TrendingUp, Truck, UsersRound, WalletCards } from "lucide-react";
import type {
  AdminPriceSignal,
  AdminRoute,
  AdminSection,
  ChatThread,
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
    upazilla: "Jashore Sadar",
    quantity: "1.2 tons",
    ask: "৳34/kg",
    grade: "B",
    harvest: "Ready tomorrow",
    image: "/assets/crops/tomato.jpg",
    postedAt: "2026-06-07T08:30:00.000Z",
  },
  {
    id: "LOT-731",
    crop: "Green Chilli",
    farmer: "Abdul Karim",
    district: "Bogura",
    upazilla: "Bogura Sadar",
    quantity: "420 kg",
    ask: "৳86/kg",
    grade: "A",
    harvest: "Ready today",
    image: "/assets/crops/green-chilli.jpg",
    postedAt: "2026-06-07T07:20:00.000Z",
  },
  {
    id: "LOT-640",
    crop: "Potato",
    farmer: "Nayan Mondol",
    district: "Rangpur",
    upazilla: "Rangpur Sadar",
    quantity: "3.6 tons",
    ask: "৳21/kg",
    grade: "A",
    harvest: "Cold stored",
    image: "/assets/crops/potato.jpg",
    postedAt: "2026-06-06T16:10:00.000Z",
  },
  {
    id: "LOT-529",
    crop: "Onion",
    farmer: "Rashed Mia",
    district: "Pabna",
    upazilla: "Pabna Sadar",
    quantity: "1.8 tons",
    ask: "৳63/kg",
    grade: "A",
    harvest: "Ready in 2 days",
    image: "/assets/crops/onion.jpg",
    postedAt: "2026-06-06T12:45:00.000Z",
  },
  {
    id: "LOT-418",
    crop: "Rice",
    farmer: "Selim Hossain",
    district: "Kushtia",
    upazilla: "Kushtia Sadar",
    quantity: "2.4 tons",
    ask: "৳38/kg",
    grade: "A",
    harvest: "Ready tomorrow",
    image: "/assets/crops/rice.png",
    postedAt: "2026-06-05T10:00:00.000Z",
  },
  {
    id: "LOT-386",
    crop: "Eggplant",
    farmer: "Fatema Khatun",
    district: "Kushtia",
    upazilla: "Kumarkhali",
    quantity: "680 kg",
    ask: "৳29/kg",
    grade: "B",
    harvest: "Ready today",
    image: "/assets/crops/eggplant.jpg",
    postedAt: "2026-06-05T09:15:00.000Z",
  },
  {
    id: "LOT-274",
    crop: "Cucumber",
    farmer: "Mizanur Rahman",
    district: "Bogura",
    upazilla: "Sherpur",
    quantity: "1.5 tons",
    ask: "৳24/kg",
    grade: "A",
    harvest: "Ready in 2 days",
    image: "/assets/crops/cucumber.jpg",
    postedAt: "2026-06-04T14:30:00.000Z",
  },
  {
    id: "LOT-193",
    crop: "Mango",
    farmer: "Hasina Begum",
    district: "Rangpur",
    upazilla: "Mithapukur",
    quantity: "950 kg",
    ask: "৳72/kg",
    grade: "A",
    harvest: "Ready tomorrow",
    image: "/assets/crops/mango.jpg",
    postedAt: "2026-06-04T11:35:00.000Z",
  },
];

export const serviceDistricts = Array.from(new Set(lots.map((lot) => lot.district)));

export const serviceUpazillas: Record<string, string[]> = {
  Bogura: ["Bogura Sadar", "Shibganj", "Sherpur", "Gabtali", "Dhunat", "Sariakandi", "Sonatala", "Adamdighi"],
  Jashore: ["Jashore Sadar", "Chaugachha", "Jhikargacha", "Keshabpur", "Manirampur", "Bagharpara", "Abhaynagar", "Sharsha"],
  Kushtia: ["Kushtia Sadar", "Kumarkhali", "Khoksa", "Mirpur", "Bheramara", "Daulatpur"],
  Pabna: ["Pabna Sadar", "Ishwardi", "Bera", "Santhia", "Sujanagar", "Chatmohar", "Bhangura", "Faridpur", "Atgharia"],
  Rangpur: ["Rangpur Sadar", "Mithapukur", "Pirgacha", "Gangachara", "Kaunia", "Badarganj", "Taraganj", "Pirganj"],
};

export function getUpazillasForDistrict(district: string) {
  return serviceUpazillas[district] ?? [];
}

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
  { label: "GMV today", value: "৳4.82L", detail: "18 orders confirmed", trend: "up", delta: "+12%", icon: BarChart3, spark: [30, 27, 28, 20, 22, 12, 6] },
  { label: "Farmer payout", value: "৳3.96L", detail: "৳82K pending escrow", trend: "up", delta: "+9%", icon: WalletCards, spark: [28, 29, 24, 25, 18, 16, 9] },
  { label: "Active supply", value: "34.1 tons", detail: "78 verified lots", trend: "steady", delta: "+4%", icon: Sprout, spark: [20, 22, 17, 21, 15, 18, 13] },
  { label: "Avg price lift", value: "16.8%", detail: "vs local middleman rate", trend: "up", delta: "+1.4pt", icon: TrendingUp, spark: [26, 24, 25, 19, 17, 14, 10] },
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
  { id: "buyers", label: "Buyers", icon: UsersRound },
  { id: "supply", label: "Supply Lots", icon: Sprout },
  { id: "farmers", label: "Farmers", icon: UsersRound },
  { id: "logistics", label: "Logistics", icon: Truck },
  { id: "payouts", label: "Payouts", icon: WalletCards },
  { id: "chat", label: "Chat", icon: MessageSquareText },
  { id: "settings", label: "Settings", icon: Settings },
];

export const defaultChatThreads: ChatThread[] = [
  {
    id: "farmer-01712000001",
    participantName: "Abdul Karim",
    participantPhone: "01712000001",
    participantRole: "farmer",
    status: "open",
    subject: "Payout and lot grading",
    updatedAt: "2026-05-25T08:40:00.000Z",
    messages: [
      {
        id: "chat-msg-1",
        createdAt: "2026-05-25T08:30:00.000Z",
        senderName: "Abdul Karim",
        senderRole: "farmer",
        text: "My green chilli lot is ready. When will grading finish?",
      },
      {
        id: "chat-msg-2",
        createdAt: "2026-05-25T08:40:00.000Z",
        senderName: "Admin",
        senderRole: "admin",
        text: "Quality check is scheduled before noon. You will get payout release status after buyer confirmation.",
      },
    ],
  },
  {
    id: "buyer-01713000002",
    participantName: "Hotel Sarina",
    participantPhone: "01713000002",
    participantRole: "buyer",
    status: "waiting",
    subject: "Pickup update for chilli order",
    updatedAt: "2026-05-25T09:05:00.000Z",
    messages: [
      {
        id: "chat-msg-3",
        createdAt: "2026-05-25T09:05:00.000Z",
        senderName: "Hotel Sarina",
        senderRole: "buyer",
        text: "Can you confirm if the Banani chilli pickup is still today?",
      },
    ],
  },
];
