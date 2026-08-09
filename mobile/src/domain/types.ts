export type AppRole = "FARMER" | "BUYER" | "CARRIER";

export type AppUser = {
  carrier?: { companyName: string; online: boolean; vehicleReg: string } | null;
  district: string;
  id: string;
  name: string;
  phone: string;
  role: AppRole;
  status: "ACTIVE" | "PENDING" | "RESTRICTED";
  verified: boolean;
};

export type ListingSummary = {
  cropId: string;
  cropBn: string;
  cropEn: string;
  districtBn: string;
  districtId: string;
  farmer: string;
  grade: "A" | "B" | "C";
  id: string;
  marketDelta: number | null;
  marketRatePoisha: number | null;
  note?: string | null;
  photo?: string;
  photos?: string[];
  pickup: string;
  pricePoisha: number;
  quantityMon: number;
  status: "LIVE" | "DRAFT" | "PAUSED" | "SOLD";
  verified: boolean;
};

export type PlatformOrder = {
  code: string;
  createdAt: string;
  escrow?: { amount: number; state: "HELD" | "RELEASED" | "REFUNDED" | "PARTIAL" | "FROZEN" } | null;
  id: string;
  listing: { crop: { nameBn: string }; district: { nameBn: string }; grade: "A" | "B" | "C" };
  quantity: number;
  stage: "PLACED" | "ACCEPTED" | "PICKED_UP" | "DELIVERED" | "PAID" | "REFUNDED";
  total: number;
  trip?: {
    carrier?: { companyName: string; vehicleReg: string } | null;
    currentLat?: number | null;
    currentLng?: number | null;
    deliverAt: string;
    id: string;
    locationAt?: string | null;
    state: TripState;
    stops: { address: string; district: { nameBn: string }; kind: "PICKUP" | "DELIVERY" }[];
  } | null;
};

export type OrderTimelineItem = {
  at: string;
  detail: string;
  label: string;
  state: "complete" | "current" | "upcoming";
};

export type TripState =
  | "OFFERED"
  | "ACCEPTED"
  | "EN_ROUTE_PICKUP"
  | "PICKED_UP"
  | "EN_ROUTE_DELIVERY"
  | "DELIVERED"
  | "CANCELLED";
