export type View = "home" | "market" | "farmer" | "buyer" | "prices" | "admin";
export type AdminSection = "dashboard" | "orders" | "supply" | "farmers" | "logistics" | "payouts" | "chat" | "settings";
export type Language = "en" | "bn";
export type Role = "admin" | "buyer" | "farmer";
export type RegistrationRole = "buyer" | "farmer";
export type AccountStatus = "pending" | "active" | "rejected";
export type ChatParticipantRole = Exclude<Role, "admin">;
export type ChatSenderRole = Role;
export type ChatStatus = "open" | "waiting" | "resolved";

export type AuthUser = {
  accountId?: string;
  name: string;
  phone: string;
  role: Role;
  signedInAt: string;
};

export type RegisteredAccount = {
  id: string;
  role: RegistrationRole;
  status: AccountStatus;
  name: string;
  phone: string;
  password: string;
  organization: string;
  district: string;
  address: string;
  identity: string;
  focus: string;
  submittedAt: string;
  reviewedAt?: string;
};

export type CropLot = {
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
  participantName: string;
  participantPhone: string;
  participantRole: ChatParticipantRole;
  status: ChatStatus;
  subject: string;
  updatedAt: string;
};
