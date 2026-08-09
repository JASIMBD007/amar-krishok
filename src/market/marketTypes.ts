export type Grade = "A" | "B" | "C";

/** A lot as the market layer sees it: quantities in mon, price in ৳ / mon. */
export type MarketLotSource = {
  id: string;
  crop: string;
  grade: string;
  farmer: string;
  farmerId?: string;
  farmerPhone?: string;
  district: string;
  upazilla?: string;
  quantityMon: number;
  pricePerMon: number;
  image?: string;
  hasFarmPhotos: boolean;
  harvest?: string;
  postedAt?: string;
  transportIncluded: boolean;
  pickupWithin24h: boolean;
  farmingSince: number;
  rating: number;
  completedOrders: number;
  /** Straight from the backend: the farmer's account status and the lot's own status. */
  farmerStatus?: string;
  status?: string;
};

/** Everything the cards, the lot page and the tables read. All of it derived, never stored. */
export type MarketLot = MarketLotSource & {
  farmerKey: string;
  title: string;
  subtitle: string;
  priceLabel: string;
  rate: number;
  rateLabel: string;
  delta: number;
  deltaLabel: string;
  deltaShort: string;
  cheap: boolean;
  dear: boolean;
  verified: boolean;
  rejected: boolean;
  suspended: boolean;
  visible: boolean;
  ratingLabel: string;
  logisticsLabel: string;
  initials: string;
  quantityKg: number;
  pricePerKg: number;
};

/** 1-5 along the buyer-facing escrow timeline. The backend derives it from the order status. */
export type EscrowStage = 1 | 2 | 3 | 4 | 5;

export type MarketSort = "price" | "delta";

export type MarketFilters = {
  crop: string;
  grade: string;
  /** null means the corresponding end of the range follows the current catalogue bounds. */
  minPrice: number | null;
  maxPrice: number | null;
  verifiedOnly: boolean;
  hasFarmPhotos: boolean;
  rating45Only: boolean;
  transportIncluded: boolean;
  pickupWithin24h: boolean;
  sort: MarketSort;
};
