/**
 * The shape both dashboard aggregates return. Every figure here is computed server-side so the web
 * app, the mobile app and any SMS summary quote the same numbers, and so no client has to know how
 * an order's money is split.
 */

export type DashboardTaskTone = "blue" | "amber" | "green" | "neutral";

/**
 * One row of "Needs you first". Generated from conditions, never a fixed list — an empty array
 * means nothing is waiting, which the UI states plainly.
 */
export type DashboardTask = {
  /** Which workspace tab or route fixes it. */
  action: "offers" | "listings" | "orders" | "payments" | "post" | "market";
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
  /** ISO date in Asia/Dhaka, the day the order was placed. Charts bucket by this, never by index. */
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
  /** Money arriving for the caller, as opposed to leaving them. */
  incoming: boolean;
  key: string;
  reference: string;
  title: string;
  when: string;
};

export type DashboardNextMovement = {
  amount: number;
  reference: string;
} | null;

export type DashboardIdentity = {
  district: string;
  name: string;
  /** True once staff have checked this account's documents. Read off the user record, not a name. */
  verified: boolean;
  /**
   * Farmers wait on an NID and land-record check, so they can sit in a pending state. A buyer has no
   * land record to be pending on, so this is always false for them.
   */
  verificationPending: boolean;
};

export type FarmerDashboard = {
  role: "farmer";
  identity: DashboardIdentity;
  ratesPublishedAt: string | null;
  counts: { listings: number; offers: number; sales: number };
  kpis: {
    /** Released to this farmer and not yet claimed: their share, after the platform fee. */
    withdrawable: number;
    canWithdraw: boolean;
    /** Their share still held across live orders on their lots. */
    inEscrow: number;
    liveOrderCount: number;
    activeListings: number;
    listedMon: number;
    /** Their earnings across every order on their lots, ever. */
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
    /** The gross this buyer paid and that is still held. Their money, so the gross is theirs. */
    heldInEscrow: number;
    openOrderCount: number;
    spendThisMonth: number;
    ordersThisMonth: number;
    /**
     * Σ(district rate × quantity) − Σ(crop subtotal), on the crop only. Null when no order could be
     * compared, in which case the card says so rather than showing a zero.
     */
    savedVsRate: number | null;
    /** The derived average delta in percent: negative is under the district rate. */
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
