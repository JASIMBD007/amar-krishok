// The market layer the design handoff is built around: every price in the app is shown next to
// today's district rate, and every order shows its escrow state explicitly. Rates are kept in
// ৳ per mon (1 mon = 40 kg) because that is the unit wholesale markets in Bangladesh quote.

export const MON_IN_KG = 40;

/** Published district rate per crop, ৳ / mon. Seed values; staff republish them from the admin console. */
export const publishedRates: Record<string, number> = {
  Tomato: 1360,
  Potato: 840,
  Onion: 2520,
  Rice: 1520,
  "Green Chilli": 3440,
  Eggplant: 1160,
  Cucumber: 960,
  Mango: 2880,
};

/** Yesterday's move per crop, in percent. Used to seed the previous rate the change % is measured against. */
export const rateChange: Record<string, number> = {
  Tomato: 2.4,
  Potato: -1.4,
  Onion: 4.8,
  Rice: 0.9,
  "Green Chilli": 6.2,
  Eggplant: 0,
  Cucumber: -2.1,
  Mango: 3.5,
};

export const cropNamesBn: Record<string, string> = {
  Tomato: "টমেটো",
  Potato: "আলু",
  Onion: "পেঁয়াজ",
  Rice: "ধান",
  "Green Chilli": "কাঁচা মরিচ",
  Eggplant: "বেগুন",
  Cucumber: "শশা",
  Mango: "আম",
  "Boro rice": "বোরো ধান",
  Jute: "পাট",
};

export const marketCrops = Object.keys(publishedRates);

/** Rates the whole platform compares against, seeded from yesterday's move. */
export function seedPreviousRates(rates: Record<string, number>) {
  return Object.keys(rates).reduce<Record<string, number>>((previous, crop) => {
    const move = rateChange[crop] ?? 0;
    previous[crop] = Math.round(rates[crop] / (1 + move / 100));
    return previous;
  }, {});
}

/** Deterministic 12-point history so the sparkline and the 30-day panel never reshuffle on re-render. */
export function rateHistory(crop: string, points = 12) {
  return Array.from({ length: points }, (_, index) => 34 + ((index * 7 + crop.length * 5) % 46));
}

export function taka(value: number) {
  return `৳ ${Math.round(value).toLocaleString("en-IN")}`;
}

export function monToKg(mon: number) {
  return mon * MON_IN_KG;
}

export function kgToMon(kg: number) {
  return kg / MON_IN_KG;
}

/** Backend lots are priced per kg; the market layer quotes per mon. */
export function perKgToPerMon(pricePerKg: number) {
  return Math.round(pricePerKg * MON_IN_KG);
}

export function perMonToPerKg(pricePerMon: number) {
  return pricePerMon / MON_IN_KG;
}

/** How far a price sits from the district rate, rounded to whole percent like the handoff specifies. */
export function deltaVsRate(price: number, rate: number) {
  if (!rate) {
    return 0;
  }

  return Math.round((price / rate - 1) * 100);
}

export function signedPercent(value: number) {
  return `${value > 0 ? "+" : ""}${value} %`;
}

/** The fair band the pricing advice uses: −4 %…+6 % of the district rate. */
export const FAIR_BAND_LOW = -4;
export const FAIR_BAND_HIGH = 6;
export const RANGE_LOW_FACTOR = 0.9;
export const RANGE_HIGH_FACTOR = 1.13;

export type FairVerdict = "fair" | "above" | "below";

export function fairVerdict(delta: number): FairVerdict {
  if (delta > FAIR_BAND_HIGH) {
    return "above";
  }

  if (delta < FAIR_BAND_LOW) {
    return "below";
  }

  return "fair";
}

export const escrowStages = [
  "Order confirmed",
  "Pickup scheduled",
  "In transit",
  "Delivered",
  "Money released",
] as const;

export const stageLabels: Record<number, string> = {
  1: "Confirmed",
  2: "Pickup scheduled",
  3: "In transit",
  4: "Delivered",
  5: "Paid",
};

export const paymentMethods = [
  { id: "bKash", label: "bKash", detail: "Wallet ****7412 · instant" },
  { id: "Nagad", label: "Nagad", detail: "Wallet ****2290 · instant" },
  { id: "Bank transfer", label: "Bank transfer", detail: "City Bank · settles in 2 h" },
] as const;

export const pickupOptions = ["Within 24 h", "2-3 days", "Buyer collects"] as const;

/** Transport is quoted per mon on the lot page and the checkout summary. */
export const TRANSPORT_PER_MON = 78;
/** Keep in step with PLATFORM_FEE_RATE in backend/src/modules/orders/escrow.ts, which charges it. */
export const PLATFORM_FEE_RATE = 0.015;
/** Pre-formatted because 0.015 * 100 is the kind of arithmetic that prints 1.4999999999999998. */
export const PLATFORM_FEE_LABEL = "1.5 %";
export const MIN_ORDER_MON = 20;
export const QTY_STEP_MON = 10;

export function orderCosts(quantityMon: number, pricePerMon: number) {
  const crop = Math.round(quantityMon * pricePerMon);
  const transport = Math.round(quantityMon * TRANSPORT_PER_MON);
  const fee = Math.round(crop * PLATFORM_FEE_RATE);
  return { crop, transport, fee, total: crop + transport + fee };
}
