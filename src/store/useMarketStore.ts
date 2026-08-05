import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { fetchPublishedRates, publishRates } from "../api/market";
import type { MarketFilters, MarketSort } from "../market/marketTypes";

const MARKET_STORAGE_KEY = "amarKrishokMarketState";

export const defaultFilters: MarketFilters = {
  crop: "All crops",
  grade: "All",
  maxPrice: null,
  verifiedOnly: false,
  sort: "price",
};

export type RateHistoryPoint = { date: string; ratePerMon: number };

type MarketStore = {
  /**
   * The published district rate per crop in ৳ / mon, as served by the backend. This is the
   * benchmark every price in the app is compared against, so it is cached once and shared.
   */
  rates: Record<string, number>;
  previousRates: Record<string, number>;
  history: Record<string, RateHistoryPoint[]>;
  ratesPublishedAt: string;
  ratesLoaded: boolean;
  ratesError: string;

  /** Staff's unsaved edits to the rates, before they publish. */
  draftRates: Record<string, number>;

  /** Purely local UI state: the SMS alert opt-in and the marketplace filter rail. */
  alerts: Record<string, boolean>;
  filters: MarketFilters;

  staffNotice: string;
  offerNotice: string;

  loadRates: (district?: string) => Promise<void>;
  setDraftRate: (crop: string, value: number) => void;
  discardDraftRates: () => void;
  publishDraftRates: (accessToken: string, district?: string) => Promise<void>;

  setFilter: <K extends keyof MarketFilters>(key: K, value: MarketFilters[K]) => void;
  resetFilters: () => void;
  toggleSort: () => void;
  toggleAlert: (crop: string) => void;

  setStaffNotice: (notice: string) => void;
  clearStaffNotice: () => void;
  setOfferNotice: (notice: string) => void;
  clearOfferNotice: () => void;
};

export const useMarketStore = create<MarketStore>()(
  persist(
    (set, get) => ({
      alerts: {},
      draftRates: {},
      filters: { ...defaultFilters },
      history: {},
      offerNotice: "",
      previousRates: {},
      rates: {},
      ratesError: "",
      ratesLoaded: false,
      ratesPublishedAt: "",
      staffNotice: "",

      loadRates: async (district) => {
        try {
          const published = await fetchPublishedRates(district);
          const rates: Record<string, number> = {};
          const previousRates: Record<string, number> = {};
          const history: Record<string, RateHistoryPoint[]> = {};

          for (const entry of published.rates) {
            rates[entry.crop] = entry.ratePerMon;
            previousRates[entry.crop] = entry.previousRatePerMon;
            history[entry.crop] = entry.history;
          }

          set({
            draftRates: { ...rates },
            history,
            previousRates,
            rates,
            ratesError: "",
            ratesLoaded: true,
            ratesPublishedAt: published.rates[0]?.publishedAt ?? new Date().toISOString(),
          });
        } catch (error) {
          // Without rates the delta pills simply do not render; the marketplace still works.
          set({
            ratesError: error instanceof Error ? error.message : "Could not load today's rates.",
            ratesLoaded: true,
          });
        }
      },

      setDraftRate: (crop, value) =>
        set((state) => ({ draftRates: { ...state.draftRates, [crop]: Number.isFinite(value) ? value : 0 } })),
      discardDraftRates: () => set((state) => ({ draftRates: { ...state.rates } })),
      publishDraftRates: async (accessToken, district) => {
        const { draftRates } = get();
        const rates = Object.entries(draftRates).map(([crop, ratePerMon]) => ({ crop, ratePerMon }));

        try {
          const published = await publishRates(accessToken, rates, district);
          const nextRates: Record<string, number> = {};
          const nextPrevious: Record<string, number> = {};
          const nextHistory: Record<string, RateHistoryPoint[]> = {};

          for (const entry of published.rates) {
            nextRates[entry.crop] = entry.ratePerMon;
            nextPrevious[entry.crop] = entry.previousRatePerMon;
            nextHistory[entry.crop] = entry.history;
          }

          set({
            draftRates: { ...nextRates },
            history: nextHistory,
            previousRates: nextPrevious,
            rates: nextRates,
            ratesPublishedAt: published.rates[0]?.publishedAt ?? new Date().toISOString(),
            staffNotice: "Today's rates are published. Every listing delta, alert and fair-price panel now uses them.",
          });
        } catch (error) {
          set({ staffNotice: error instanceof Error ? error.message : "Could not publish today's rates." });
        }
      },

      setFilter: (key, value) => set((state) => ({ filters: { ...state.filters, [key]: value } })),
      resetFilters: () => set({ filters: { ...defaultFilters } }),
      toggleSort: () =>
        set((state) => ({
          filters: { ...state.filters, sort: (state.filters.sort === "price" ? "delta" : "price") as MarketSort },
        })),
      toggleAlert: (crop) => set((state) => ({ alerts: { ...state.alerts, [crop]: !state.alerts[crop] } })),

      setStaffNotice: (notice) => set({ staffNotice: notice }),
      clearStaffNotice: () => set({ staffNotice: "" }),
      setOfferNotice: (notice) => set({ offerNotice: notice }),
      clearOfferNotice: () => set({ offerNotice: "" }),
    }),
    {
      name: MARKET_STORAGE_KEY,
      // Only the SMS alert opt-in is worth remembering between visits. Rates, offers and escrow are
      // the backend's record now, so caching them locally would only let them go stale.
      partialize: (state) => ({ alerts: state.alerts }),
      storage: createJSONStorage(() => window.localStorage),
    },
  ),
);
