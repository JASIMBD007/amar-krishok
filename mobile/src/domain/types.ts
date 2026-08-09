export type AppRole = "FARMER" | "BUYER" | "CARRIER";

export type AppUser = {
  district: string;
  id: string;
  name: string;
  phone: string;
  role: AppRole;
  status: "ACTIVE" | "PENDING" | "RESTRICTED";
  verified: boolean;
};

export type ListingSummary = {
  cropBn: string;
  cropEn: string;
  districtBn: string;
  farmer: string;
  grade: "A" | "B" | "C";
  id: string;
  marketDelta: number;
  photo?: string;
  pickup: string;
  pricePoisha: number;
  quantityMon: number;
  status: "LIVE" | "DRAFT" | "PAUSED" | "SOLD";
  verified: boolean;
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
