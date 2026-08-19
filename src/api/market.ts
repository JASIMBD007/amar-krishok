import { apiRequest, type BackendOrder } from "./auth";

/**
 * The market layer's server API: published district rates, buyer offers, and the escrow decisions
 * on an order. These used to be client-side state; they are now the backend's record.
 */

export type BackendRatePoint = {
  date: string;
  ratePerMon: number;
};

export type BackendCropRate = {
  crop: string;
  history: BackendRatePoint[];
  previousRatePerMon: number;
  publishedAt: string;
  ratePerMon: number;
};

export type BackendPublishedRates = {
  district: string;
  monInKg: number;
  rates: BackendCropRate[];
};

export type BackendOfferStatus = "OPEN" | "ACCEPTED" | "DECLINED";

export type BackendLotOffer = {
  id: string;
  buyer: { id: string; name: string; organization: string | null };
  cropLot: {
    crop: { name: string };
    district: { name: string };
    farmerId: string;
    grade: string;
    id: string;
    pricePerKg: string | number;
    quantityKg: string | number;
    status: string;
  };
  createdAt: string;
  note: string | null;
  pricePerKg: string | number;
  respondedAt: string | null;
  status: BackendOfferStatus;
};

/** Public: the benchmark is visible before signing in, which is the whole point of the ticker. */
export function fetchPublishedRates(district?: string) {
  const query = district && district !== "All districts" ? `?district=${encodeURIComponent(district)}` : "";
  return apiRequest<BackendPublishedRates>(`/api/market-prices/rates${query}`);
}

export function publishRates(
  accessToken: string,
  rates: Array<{ crop: string; ratePerMon: number }>,
  district?: string,
) {
  return apiRequest<BackendPublishedRates>("/api/market-prices/publish", {
    accessToken,
    body: JSON.stringify({ district, rates }),
    method: "POST",
  });
}

export type BackendPlatformStats = {
  liveListings: number;
  cropsTracked: number;
  /** Null until a payment has actually been released; the UI hides the figure rather than inventing one. */
  medianReleaseMinutes: number | null;
  verifiedFarmers: number;
};

/** Public: the landing page reads this before anyone signs in. */
export function fetchPlatformStats() {
  return apiRequest<BackendPlatformStats>("/api/stats/platform");
}

/** Records a withdrawal request for staff. Does not move money — bKash disbursement is manual. */
export function requestPayout(accessToken: string) {
  return apiRequest<{ amount: number; reference: string; requestedPayouts: number }>("/api/orders/payout-request", {
    accessToken,
    method: "POST",
  });
}

export function fetchLotOffers(accessToken: string) {
  return apiRequest<BackendLotOffer[]>("/api/offers", { accessToken });
}

export function createLotOffer(accessToken: string, payload: { cropLotId: string; note?: string; pricePerKg: number }) {
  return apiRequest<BackendLotOffer>("/api/offers", {
    accessToken,
    body: JSON.stringify(payload),
    method: "POST",
  });
}

export function respondToLotOffer(accessToken: string, id: string, action: "accept" | "decline") {
  return apiRequest<BackendLotOffer>(`/api/offers/${id}/respond`, {
    accessToken,
    body: JSON.stringify({ action }),
    method: "PATCH",
  });
}

/** The buyer moving their own order one step along the escrow timeline. */
export function advanceOrderStage(accessToken: string, id: string) {
  return apiRequest<BackendOrder>(`/api/orders/${id}/advance`, {
    accessToken,
    method: "PATCH",
  });
}

/** Staff: every order with an open dispute, escrow still frozen. */
export function fetchDisputedOrders(accessToken: string) {
  return apiRequest<BackendOrder[]>("/api/orders/disputes", { accessToken });
}

export function decideOrderEscrow(accessToken: string, id: string, action: "release" | "refund", reason?: string) {
  return apiRequest<BackendOrder>(`/api/orders/${id}/escrow`, {
    accessToken,
    body: JSON.stringify({ action, reason }),
    method: "PATCH",
  });
}

export function decideOrderDispute(accessToken: string, id: string, action: "open" | "close", reason?: string) {
  return apiRequest<BackendOrder>(`/api/orders/${id}/dispute`, {
    accessToken,
    body: JSON.stringify({ action, reason }),
    method: "PATCH",
  });
}
