import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowUpDown, Check, Inbox, Leaf, PenLine, Search, SlidersHorizontal, Star, Truck } from "lucide-react";
import { useLanguage, useTranslate, useValueText } from "../../i18n";
import { applyMarketFilters, sortLots } from "../../market/deriveLots";
import { cropNamesBn, taka } from "../../market/marketData";
import type { MarketLot } from "../../market/marketTypes";
import { useMarketLots } from "../../market/useMarket";
import { useMarketStore } from "../../store/useMarketStore";
import type { AuthUser, CropLot } from "../../types";
import { ListLoading } from "../EmptyState";
import { DeltaPill, VerificationBadge } from "../market/MarketBits";

const MARKETPLACE_PAGE_SIZE = 12;
const PRICE_STEP = 20;

function priceBounds(lots: MarketLot[]) {
  if (lots.length === 0) {
    return { max: 4000, min: 400 };
  }

  const prices = lots.map((lot) => lot.pricePerMon);
  const min = Math.floor(Math.min(...prices) / PRICE_STEP) * PRICE_STEP;
  const max = Math.ceil(Math.max(...prices) / PRICE_STEP) * PRICE_STEP;
  // A single price point would collapse the slider, so always leave it something to travel.
  return max > min ? { max, min } : { max: max + PRICE_STEP * 5, min: Math.max(0, min - PRICE_STEP * 5) };
}

export function MarketplacePage({
  district,
  districtOptions,
  error,
  filteredLots,
  isLoading,
  query,
  setDistrict,
  setQuery,
  currentUser,
  onEditLot,
}: {
  district: string;
  districtOptions: string[];
  error?: string;
  filteredLots: CropLot[];
  isLoading?: boolean;
  query: string;
  setDistrict: (value: string) => void;
  setQuery: (value: string) => void;
  currentUser?: AuthUser | null;
  onEditLot: (lot: CropLot) => void;
}) {
  const language = useLanguage();
  const navigate = useNavigate();
  const t = useTranslate();
  const v = useValueText();
  const [page, setPage] = useState(0);

  const filters = useMarketStore((state) => state.filters);
  const setFilter = useMarketStore((state) => state.setFilter);
  const resetMarketFilters = useMarketStore((state) => state.resetFilters);
  const toggleSort = useMarketStore((state) => state.toggleSort);
  const rates = useMarketStore((state) => state.rates);

  const marketLots = useMarketLots(filteredLots);
  const bounds = useMemo(() => priceBounds(marketLots), [marketLots]);
  const maxPrice = filters.maxPrice ?? bounds.max;

  const cropCounts = useMemo(() => {
    const counts = new Map<string, number>();
    marketLots.forEach((lot) => {
      if (lot.visible) {
        counts.set(lot.crop, (counts.get(lot.crop) ?? 0) + 1);
      }
    });
    return counts;
  }, [marketLots]);

  const visibleCount = useMemo(() => marketLots.filter((lot) => lot.visible).length, [marketLots]);
  const cropOptions = useMemo(() => ["All crops", ...Array.from(cropCounts.keys()).sort()], [cropCounts]);

  const results = useMemo(
    () => sortLots(applyMarketFilters(marketLots, { ...filters, maxPrice }), filters.sort),
    [filters, marketLots, maxPrice],
  );

  const totalPages = Math.max(1, Math.ceil(results.length / MARKETPLACE_PAGE_SIZE));
  const resultVolume = results.reduce((total, lot) => total + lot.quantityMon, 0);
  // With a crop selected this is that crop's rate; across all crops the demo still shows a
  // benchmark, so fall back to the mean of everything published today.
  const publishedRateValues = Object.values(rates);
  const averageRate =
    filters.crop === "All crops"
      ? publishedRateValues.length
        ? Math.round(publishedRateValues.reduce((total, rate) => total + rate, 0) / publishedRateValues.length)
        : null
      : rates[filters.crop] ?? null;

  useEffect(() => {
    setPage(0);
  }, [district, filters, query]);

  useEffect(() => {
    setPage((current) => Math.min(current, totalPages - 1));
  }, [totalPages]);

  const pageLots = useMemo(
    () => results.slice(page * MARKETPLACE_PAGE_SIZE, page * MARKETPLACE_PAGE_SIZE + MARKETPLACE_PAGE_SIZE),
    [page, results],
  );

  const resetEverything = () => {
    resetMarketFilters();
    setDistrict("All districts");
    setQuery("");
  };

  const canEditLot = (lot: MarketLot) =>
    Boolean(
      currentUser?.role === "farmer" &&
        ((lot.farmerId && lot.farmerId === currentUser.accountId) ||
          (lot.farmerPhone && lot.farmerPhone === currentUser.phone)),
    );

  const cropLabel = (crop: string) => (language === "bn-BD" ? cropNamesBn[crop] ?? t(crop) : t(crop));

  return (
    <section className="page-wrap market-layout">
      <aside className="filter-rail" aria-label={t("Filters")}>
        <div className="filter-rail-head">
          <span>
            <SlidersHorizontal aria-hidden="true" size={16} />
            {t("Filters")}
          </span>
          <button className="link-button" type="button" onClick={resetEverything}>
            {t("Reset")}
          </button>
        </div>

        <div className="filter-section">
          <span className="filter-eyebrow">{t("Crop")}</span>
          <div className="filter-check-list" role="radiogroup" aria-label={t("Crop")}>
            {cropOptions.map((crop) => {
              const selected = filters.crop === crop;
              const count = crop === "All crops" ? visibleCount : cropCounts.get(crop) ?? 0;

              return (
                <button
                  aria-checked={selected}
                  className={selected ? "filter-check on" : "filter-check"}
                  key={crop}
                  role="radio"
                  type="button"
                  onClick={() => setFilter("crop", crop)}
                >
                  <span className="filter-box" aria-hidden="true">
                    {selected ? <Check size={12} /> : null}
                  </span>
                  {crop === "All crops" ? t("All crops") : cropLabel(crop)}
                  <em>{v(count)}</em>
                </button>
              );
            })}
          </div>
        </div>

        <div className="filter-section">
          <span className="filter-eyebrow" id="market-district-label">
            {t("District")}
          </span>
          <select
            aria-labelledby="market-district-label"
            onChange={(event) => setDistrict(event.target.value)}
            value={district}
          >
            <option value="All districts">{t("All districts")}</option>
            {districtOptions.map((option) => (
              <option key={option} value={option}>
                {t(option)}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-section">
          <div className="filter-label-row">
            <span className="filter-eyebrow" id="market-price-label">
              {t("Max price / mon")}
            </span>
            <strong className="mono-figure">{v(taka(maxPrice))}</strong>
          </div>
          <input
            aria-labelledby="market-price-label"
            className="filter-range"
            max={bounds.max}
            min={bounds.min}
            onChange={(event) => setFilter("maxPrice", Number(event.target.value))}
            step={PRICE_STEP}
            type="range"
            value={maxPrice}
          />
        </div>

        <div className="filter-section">
          <span className="filter-eyebrow">{t("Grade")}</span>
          <div className="filter-pill-group" role="radiogroup" aria-label={t("Grade")}>
            {["All", "A", "B", "C"].map((grade) => (
              <button
                aria-checked={filters.grade === grade}
                className={filters.grade === grade ? "filter-pill on" : "filter-pill"}
                key={grade}
                role="radio"
                type="button"
                onClick={() => setFilter("grade", grade)}
              >
                {grade === "All" ? t("All") : v(grade)}
              </button>
            ))}
          </div>
        </div>

        <div className="filter-section">
          <span className="filter-eyebrow">{t("Trust")}</span>
          <button
            aria-checked={filters.verifiedOnly}
            className="filter-switch"
            role="switch"
            type="button"
            onClick={() => setFilter("verifiedOnly", !filters.verifiedOnly)}
          >
            <span className={filters.verifiedOnly ? "switch-track on" : "switch-track"} aria-hidden="true">
              <span className="switch-knob" />
            </span>
            {t("Verified farms only")}
          </button>
        </div>
      </aside>

      <div className="market-results">
        <div className="market-search-card">
          <label className="search-field">
            <Search aria-hidden="true" size={18} />
            <input
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t("Crop, farmer or district")}
              value={query}
            />
          </label>
          <button className="secondary-button" type="button" onClick={toggleSort}>
            <ArrowUpDown aria-hidden="true" size={15} />
            {t(filters.sort === "price" ? "Price: lowest first" : "Best vs. market")}
          </button>
        </div>

        <div className="market-result-head">
          <div className="market-result-title">
            <strong>
              {filters.crop === "All crops" ? t("All crops") : cropLabel(filters.crop)}
              {district === "All districts" ? "" : ` · ${t(district)}`}
            </strong>
            <span>
              {v(results.length)} {t("listings")} · {v(resultVolume.toLocaleString("en-IN"))} {t("mon available")}
            </span>
          </div>
          {averageRate ? (
            <span className="market-result-rate">
              {t("District average")} <strong className="mono-figure">{v(taka(averageRate))}</strong> / {t("mon")}
            </span>
          ) : null}
        </div>

        {isLoading ? <ListLoading label={t("Loading marketplace lots...")} /> : null}
        {error ? <p className="marketplace-feedback warning">{t(error)}</p> : null}

        {!isLoading && results.length > 0 ? (
          <div className="lot-grid">
            {pageLots.map((lot) => (
              <article className="lot-card" key={lot.id}>
                <div className="lot-card-photo">
                  {lot.image ? (
                    <img alt={`${cropLabel(lot.crop)} ${t("harvest")}`} src={lot.image} />
                  ) : (
                    <Leaf aria-hidden="true" size={30} />
                  )}
                </div>
                <div className="lot-card-body">
                  <div>
                    <div className="lot-card-heading">
                      <h2>
                        {cropLabel(lot.crop)} · {t("Grade")} {v(lot.grade)}
                      </h2>
                      <VerificationBadge verified={lot.verified} />
                    </div>
                    <p>
                      {t(lot.farmer)} · {t(lot.district)} · {v(lot.quantityMon)} {t("mon")}
                    </p>
                  </div>
                  <div className="lot-card-price">
                    <strong className="mono-figure">{v(lot.priceLabel)}</strong>
                    <span>/ {t("mon")}</span>
                    <DeltaPill delta={lot.delta} />
                  </div>
                  <div className="lot-card-meta">
                    <span>
                      <Star aria-hidden="true" size={13} /> {lot.completedOrders ? v(lot.ratingLabel) : t("New seller")}
                    </span>
                    <span>
                      <Truck aria-hidden="true" size={13} /> {t(lot.logisticsLabel)}
                    </span>
                    <span className="lot-card-vs">{t("vs. market")}</span>
                  </div>
                  <div className="lot-card-actions">
                    <button className="primary-button full" type="button" onClick={() => navigate(`/lot/${lot.id}`)}>
                      {t("View lot")}
                    </button>
                    {canEditLot(lot) ? (
                      <button
                        className="edit-lot-button"
                        type="button"
                        onClick={() => {
                          const source = filteredLots.find((item) => item.id === lot.id);
                          if (source) {
                            onEditLot(source);
                          }
                        }}
                      >
                        <PenLine aria-hidden="true" size={16} />
                        {t("Edit")}
                      </button>
                    ) : null}
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : null}

        {!isLoading && results.length === 0 ? (
          <div className="market-empty">
            <Inbox aria-hidden="true" size={32} />
            <strong>{t("No lots match these filters")}</strong>
            <p>{t("Widen the price range or clear the district.")}</p>
            <button className="secondary-button" type="button" onClick={resetEverything}>
              {t("Reset filters")}
            </button>
          </div>
        ) : null}

        {totalPages > 1 ? (
          <nav className="marketplace-pagination" aria-label={t("Marketplace pages")}>
            <button
              className="secondary-button"
              disabled={page === 0}
              type="button"
              onClick={() => setPage((current) => Math.max(0, current - 1))}
            >
              {t("Previous")}
            </button>
            <span className="marketplace-page-status">
              {v(page + 1)} / {v(totalPages)}
            </span>
            <button
              className="secondary-button"
              disabled={page >= totalPages - 1}
              type="button"
              onClick={() => setPage((current) => Math.min(totalPages - 1, current + 1))}
            >
              {t("Next")}
            </button>
          </nav>
        ) : null}
      </div>
    </section>
  );
}
