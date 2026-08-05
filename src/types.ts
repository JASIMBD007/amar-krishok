export type View = "home" | "market" | "farmer" | "buyer" | "prices" | "admin";
export type AdminSection =
  | "dashboard"
  | "orders"
  | "market"
  | "buyers"
  | "supply"
  | "farmers"
  | "logistics"
  | "payouts"
  | "chat"
  | "settings";
export type Language = "en" | "bn";
export type Role = "admin" | "buyer" | "farmer";
export type RegistrationRole = "buyer" | "farmer";
export type AccountStatus = "pending" | "active" | "rejected";
export type ChatParticipantRole = RegistrationRole | "guest";
export type ChatSenderRole = Role | "guest";
export type ChatStatus = "open" | "waiting" | "resolved";
export type NotificationTone = "info" | "success" | "urgent" | "warning";
export type NotificationType = "account" | "chat" | "logistics" | "order" | "payout" | "supply" | "system";

export type AuthUser = {
  accountId?: string;
  accessToken?: string;
  name: string;
  phone: string;
  role: Role;
  signedInAt: string;
  username: string;
};

export type RegisteredAccount = {
  id: string;
  role: RegistrationRole;
  status: AccountStatus;
  name: string;
  phone: string;
  username: string;
  password: string;
  organization: string;
  district: string;
  upazilla: string;
  address: string;
  identity: string;
  focus: string;
  submittedAt: string;
  reviewedAt?: string;
  cropLots?: RegisteredCropLotRecord[];
  cropLotCount?: number;
  cropLotQuantityKg?: number;
  latestLotStatus?: string;
  latestLotSummary?: string;
  orderCount?: number;
  orderValue?: number;
  latestOrderStatus?: string;
  latestOrderSummary?: string;
};

export type RegisteredCropLotRecord = {
  id: string;
  crop: string;
  district: string;
  upazilla?: string;
  grade: string;
  harvestDate?: string;
  imageUrl?: string;
  notes?: string;
  pricePerKg: number;
  quantityKg: number;
  status: string;
  createdAt?: string;
  updatedAt?: string;
};

export type CropLot = {
  farmerId?: string;
  farmerPhone?: string;
  id: string;
  crop: string;
  farmer: string;
  district: string;
  upazilla?: string;
  quantity: string;
  ask: string;
  grade: string;
  harvest: string;
  image: string;
  postedAt?: string;
  // Numeric source values for the market layer, which quotes ৳ / mon (1 mon = 40 kg) and needs
  // to compare every ask against today's district rate. `quantity` and `ask` stay as the
  // display strings the cards already use.
  pricePerKg?: number;
  quantityKg?: number;
  completedOrders?: number;
  farmingSince?: number;
  rating?: number;
  transportIncluded?: boolean;
  /** The farmer's account status: ACTIVE means staff verified their NID and land papers. */
  farmerStatus?: string;
  /** The lot's own status. Anything other than ACTIVE is hidden from the marketplace. */
  status?: string;
};

export type MarketPrice = {
  crop: string;
  district: string;
  farmerAsk: string;
  wholesale: string;
  retail: string;
  trend: string;
};

export type Order = {
  id: string;
  buyer: string;
  crop: string;
  quantity: string;
  destination: string;
  value: string;
  status: "Matching" | "Pickup booked" | "In transit" | "Quality check";
};

export type DashboardStat = {
  label: string;
  value: string;
  detail: string;
  trend: "up" | "down" | "steady";
  delta?: string;
  spark?: number[];
  icon?: import("lucide-react").LucideIcon;
};

export type AdminRoute = {
  route: string;
  driver: string;
  lots: string;
  status: string;
  temperature: string;
};

export type AdminPriceSignal = {
  crop: string;
  region: string;
  farmerAsk: number;
  wholesale: number;
  market: number;
};

export type ChatMessage = {
  id: string;
  createdAt: string;
  senderName: string;
  senderRole: ChatSenderRole;
  text: string;
};

export type ChatThread = {
  id: string;
  messages: ChatMessage[];
  participantId?: string;
  participantName: string;
  participantPhone: string;
  participantRole: ChatParticipantRole;
  status: ChatStatus;
  subject: string;
  updatedAt: string;
};

export type ChatParticipant = {
  id: string;
  name: string;
  phone: string;
  role: ChatParticipantRole;
};

export type AppNotification = {
  body: string;
  createdAt?: string;
  href?: string;
  id: string;
  meta: string;
  readAt?: string | null;
  title: string;
  tone: NotificationTone;
  type: NotificationType;
};
