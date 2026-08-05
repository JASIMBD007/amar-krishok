import { useEffect, useMemo } from "react";
import { useMarketStore } from "../store/useMarketStore";
import type { CropLot } from "../types";
import { decorateLot, toMarketLotSource } from "./deriveLots";
import { rateHistory } from "./marketData";
import type { MarketLot } from "./marketTypes";

/**
 * Turns the lots a page already has into market lots. Deriving here rather than storing means a
 * staff rate publish, a verification decision or a suspension propagates to every surface for free.
 */
export function useMarketLots(lots: CropLot[]): MarketLot[] {
  const rates = useMarketStore((state) => state.rates);

  return useMemo(() => lots.map((lot) => decorateLot(toMarketLotSource(lot), { rates })), [lots, rates]);
}

/** Loads the published rates once per session. Safe to call from several surfaces. */
export function useLoadRates() {
  const loadRates = useMarketStore((state) => state.loadRates);
  const ratesLoaded = useMarketStore((state) => state.ratesLoaded);

  useEffect(() => {
    if (!ratesLoaded) {
      void loadRates();
    }
  }, [loadRates, ratesLoaded]);
}

/** Signed daily move per crop, in percent, to one decimal. */
export function useRateChanges() {
  const rates = useMarketStore((state) => state.rates);
  const previousRates = useMarketStore((state) => state.previousRates);

  return useMemo(
    () =>
      Object.keys(rates).reduce<Record<string, number>>((changes, crop) => {
        const current = rates[crop];
        const previous = previousRates[crop] || current;
        changes[crop] = current && previous ? Math.round((current / previous - 1) * 1000) / 10 : 0;
        return changes;
      }, {}),
    [previousRates, rates],
  );
}

/** Crops that have a published rate, in the order the backend returned them. */
export function useRateCrops() {
  const rates = useMarketStore((state) => state.rates);
  return useMemo(() => Object.keys(rates), [rates]);
}

/**
 * The rate series behind the sparklines. Uses the real published history when the backend has
 * enough points and falls back to a deterministic shape so a new crop still renders a chart.
 */
export function useRateSeries(crop: string, points = 12) {
  const history = useMarketStore((state) => state.history[crop]);

  return useMemo(() => {
    if (!history || history.length < 2) {
      return rateHistory(crop, points);
    }

    const values = history.slice(-points).map((entry) => entry.ratePerMon);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    // Normalise to the 34-80 % bar heights the chart is designed around.
    return values.map((value) => 34 + ((value - min) / range) * 46);
  }, [crop, history, points]);
}
