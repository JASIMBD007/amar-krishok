import { apiRequest } from "./auth";

/**
 * The two role dashboards. Each is a single aggregate, computed server-side, because the money split
 * and the district-rate comparison must not be re-derived per client: the web app, the mobile app
 * and any SMS summary have to agree on every figure.
 */

export type DashboardTaskTone = "blue" | "amber" | "green" | "neutral";

export type DashboardTaskAction = "offers" | "listings" | "orders" | "payments" | "post" | "market";

export type DashboardTask = {
  action: DashboardTaskAction;
  body: string;
  cta: string;
  icon: string;
  key: string;
  title: string;
  tone: DashboardTaskTone;
};

export type DashboardStageCount = {
  key: "awaiting-pickup" | "in-transit" | "delivered" | "paid-out";
  label: string;
  count: number;
};

export type DashboardDayPoint = {
  date: string;
  label: string;
  value: number;
};

export type DashboardCropSlice = {
  crop: string;
  value: number;
};

export type DashboardLedgerRow = {
  amount: number;
  incoming: boolean;
  key: string;
  reference: string;
  title: string;
  when: string;
};

export type DashboardNextMovement = { amount: number; reference: string } | null;

export type DashboardIdentity = {
  district: string;
  name: string;
  verified: boolean;
  verificationPending: boolean;
};

export type FarmerDashboard = {
  role: "farmer";
  identity: DashboardIdentity;
  ratesPublishedAt: string | null;
  counts: { listings: number; offers: number; sales: number };
  kpis: {
    withdrawable: number;
    canWithdraw: boolean;
    inEscrow: number;
    liveOrderCount: number;
    activeListings: number;
    listedMon: number;
    season: number;
    saleCount: number;
  };
  tasks: DashboardTask[];
  stages: DashboardStageCount[];
  daySeries: DashboardDayPoint[];
  tradingDays: number;
  byCrop: DashboardCropSlice[];
  nextMovement: DashboardNextMovement;
  ledger: DashboardLedgerRow[];
  payoutAccount: { label: string; masked: string } | null;
};

export type BuyerDashboard = {
  role: "buyer";
  identity: DashboardIdentity;
  ratesPublishedAt: string | null;
  counts: { orders: number; suppliers: number };
  kpis: {
    heldInEscrow: number;
    openOrderCount: number;
    spendThisMonth: number;
    ordersThisMonth: number;
    savedVsRate: number | null;
    savedVsRateDelta: number | null;
    comparedOrderCount: number;
    needsAction: number;
  };
  tasks: DashboardTask[];
  stages: DashboardStageCount[];
  daySeries: DashboardDayPoint[];
  tradingDays: number;
  byCrop: DashboardCropSlice[];
  nextMovement: DashboardNextMovement;
  ledger: DashboardLedgerRow[];
  suppliers: Array<{ district: string; name: string; orderCount: number; value: number }>;
  paymentMethod: string | null;
};

export function fetchFarmerDashboard(accessToken: string) {
  return apiRequest<FarmerDashboard>("/api/desk/dashboard", { accessToken });
}

export function fetchBuyerDashboard(accessToken: string) {
  return apiRequest<BuyerDashboard>("/api/buyer/dashboard", { accessToken });
}
