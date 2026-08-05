import type { CropLot } from "../types";
import {
  deltaVsRate,
  kgToMon,
  monToKg,
  perKgToPerMon,
  perMonToPerKg,
  signedPercent,
  taka,
} from "./marketData";
import type { MarketFilters, MarketLot, MarketLotSource } from "./marketTypes";

export function farmerInitials(name: string) {
  return name
    .replace(/^(Md\.|Mst\.|Mrs\.|Mr\.)\s*/i, "")
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function farmerKeyFor(lot: { farmerId?: string; farmer: string }) {
  return lot.farmerId ?? lot.farmer;
}

function parseTakaPerKg(ask: string) {
  const digits = ask.replace(/[^\d.]/g, "");
  const value = Number(digits);
  return Number.isFinite(value) ? value : 0;
}

function parseQuantityKg(quantity: string) {
  const value = Number(quantity.replace(/[^\d.]/g, ""));
  if (!Number.isFinite(value)) {
    return 0;
  }

  return /ton/i.test(quantity) ? value * 1000 : value;
}

/**
 * A lot the marketplace already loads (backend or seed catalogue) expressed in the units the
 * market layer works in. Anything the backend does not track yet is derived deterministically
 * from the lot id so cards do not reshuffle between renders.
 */
export function toMarketLotSource(lot: CropLot): MarketLotSource {
  const pricePerKg = lot.pricePerKg ?? parseTakaPerKg(lot.ask);
  const quantityKg = lot.quantityKg ?? parseQuantityKg(lot.quantity);
  const seed = lot.id.split("").reduce((total, character) => total + character.charCodeAt(0), 0);

  return {
    completedOrders: lot.completedOrders ?? seed % 90,
    crop: lot.crop,
    district: lot.district,
    farmer: lot.farmer,
    farmerId: lot.farmerId,
    farmerPhone: lot.farmerPhone,
    farmerStatus: lot.farmerStatus,
    farmingSince: lot.farmingSince ?? 2006 + (seed % 18),
    grade: lot.grade.replace(/^Grade\s+/i, "") || "B",
    harvest: lot.harvest,
    id: lot.id,
    image: lot.image,
    postedAt: lot.postedAt,
    pricePerMon: perKgToPerMon(pricePerKg),
    quantityMon: Math.max(1, Math.round(kgToMon(quantityKg))),
    rating: lot.rating ?? Math.round((41 + (seed % 9)) / 10 * 10) / 10,
    status: lot.status,
    transportIncluded: lot.transportIncluded ?? seed % 2 === 0,
    upazilla: lot.upazilla,
  };
}

/**
 * Verification and suspension come from the backend's own records — the farmer's account status and
 * the lot's status — so a staff decision propagates everywhere without a parallel client-side map.
 */
export function decorateLot(source: MarketLotSource, context: { rates: Record<string, number> }): MarketLot {
  const farmerKey = farmerKeyFor(source);
  const rate = context.rates[source.crop] ?? source.pricePerMon;
  const delta = deltaVsRate(source.pricePerMon, rate);
  const farmerStatus = source.farmerStatus?.toUpperCase();
  const lotStatus = source.status?.toUpperCase();
  const rejected = farmerStatus === "REJECTED";
  const suspended = Boolean(lotStatus && lotStatus !== "ACTIVE");

  return {
    ...source,
    cheap: delta <= 0,
    dear: delta > 0,
    delta,
    deltaLabel: `${signedPercent(delta)} vs. market`,
    deltaShort: signedPercent(delta),
    farmerKey,
    initials: farmerInitials(source.farmer),
    logisticsLabel: source.transportIncluded ? "Transport incl." : "Pickup 24 h",
    priceLabel: taka(source.pricePerMon),
    pricePerKg: perMonToPerKg(source.pricePerMon),
    quantityKg: monToKg(source.quantityMon),
    rate,
    rateLabel: taka(rate),
    ratingLabel: source.completedOrders ? `${source.rating.toFixed(1)} · ${source.completedOrders}` : "New seller",
    rejected,
    subtitle: `${source.farmer} · ${source.district} · ${source.quantityMon} mon`,
    suspended,
    title: `${source.crop} · Grade ${source.grade}`,
    verified: farmerStatus === "ACTIVE",
    visible: !rejected && !suspended,
  };
}

/** Marketplace and the home "cheapest lots" card only ever show lots staff have not pulled. */
export function visibleLots(lots: MarketLot[]) {
  return lots.filter((lot) => lot.visible);
}

/**
 * The filter rail's own filters. Free-text search and the district filter are applied upstream so
 * they can stay translation-aware, which means this only handles what the rail itself owns.
 */
export function applyMarketFilters(lots: MarketLot[], filters: MarketFilters) {
  return lots.filter((lot) => {
    if (!lot.visible) {
      return false;
    }

    if (filters.crop !== "All crops" && lot.crop !== filters.crop) {
      return false;
    }

    if (filters.grade !== "All" && lot.grade !== filters.grade) {
      return false;
    }

    if (filters.maxPrice !== null && lot.pricePerMon > filters.maxPrice) {
      return false;
    }

    if (filters.verifiedOnly && !lot.verified) {
      return false;
    }

    return true;
  });
}

export function sortLots(lots: MarketLot[], sort: MarketFilters["sort"]) {
  return [...lots].sort((first, second) =>
    sort === "price" ? first.pricePerMon - second.pricePerMon : first.delta - second.delta,
  );
}

/** Cheapest against their own district rate — what the landing card promises. */
export function cheapestVsMarket(lots: MarketLot[], count = 3) {
  return [...visibleLots(lots)].sort((first, second) => first.delta - second.delta).slice(0, count);
}
