import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import { ApiRequestError, fetchMyCropLots, type BackendCropLot } from "../../api/auth";
import { fetchFarmerEscrow, fetchLotOffers } from "../../api/market";
import { useTranslate } from "../../i18n";
import { kgToMon } from "../../market/marketData";
import type { AuthUser } from "../../types";
import { ListLoading } from "../EmptyState";
import {
  FarmerDeskBadge,
  FarmerEscrowKpis,
  FarmerListingsVsMarket,
  FarmerOffersPanel,
  type FarmerEscrowSummary,
  type FarmerLotSummary,
} from "./farmer/FarmerMarketPanels";

function numericValue(value: string | number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

const emptyEscrow: FarmerEscrowSummary = {
  grossValue: 0,
  held: 0,
  heldCount: 0,
  orderCount: 0,
  released: 0,
  releasedCount: 0,
};

/**
 * The farmer desk: what a farmer is owed, what they have listed, and who is offering.
 *
 * Deliberately flat — no sidebar and no forms. Posting a crop and editing a listing are their own
 * routes, so this page answers "where is my money and what is happening to my lots" and nothing else.
 */
export function FarmerDeskPage({ user }: { user: AuthUser | null }) {
  const navigate = useNavigate();
  const t = useTranslate();
  const [lots, setLots] = useState<BackendCropLot[]>([]);
  const [escrow, setEscrow] = useState<FarmerEscrowSummary>(emptyEscrow);
  // Open offers per lot, so the listings table can say "Live · 2 offers" the way the v2 desk does.
  const [offerCounts, setOfferCounts] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const accessToken = user?.accessToken;

  const load = useCallback(() => {
    if (!accessToken) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    Promise.all([
      fetchMyCropLots(accessToken),
      fetchFarmerEscrow(accessToken).catch(() => emptyEscrow),
      fetchLotOffers(accessToken).catch(() => []),
    ])
      .then(([myLots, summary, offers]) => {
        setLots(myLots);
        setEscrow(summary);
        setOfferCounts(
          offers
            .filter((offer) => offer.status === "OPEN")
            .reduce<Record<string, number>>((counts, offer) => {
              counts[offer.cropLot.id] = (counts[offer.cropLot.id] ?? 0) + 1;
              return counts;
            }, {}),
        );
        setError("");
      })
      .catch((requestError) => {
        setError(requestError instanceof ApiRequestError ? requestError.message : "Could not load your desk.");
      })
      .finally(() => setIsLoading(false));
  }, [accessToken]);

  useEffect(() => load(), [load]);

  const summaries = useMemo<FarmerLotSummary[]>(
    () =>
      lots.map((lot) => ({
        active: lot.status.toUpperCase() === "ACTIVE",
        crop: lot.crop.name,
        district: lot.district.name,
        grade: lot.grade,
        id: lot.id,
        pricePerKg: numericValue(lot.pricePerKg),
        quantityKg: numericValue(lot.quantityKg),
      })),
    [lots],
  );

  const activeLots = summaries.filter((lot) => lot.active);
  const listedMon = Math.round(kgToMon(activeLots.reduce((total, lot) => total + lot.quantityKg, 0)));
  const latestLot = lots[0];
  // The badge reads the same account status the listing badges use, so the two cannot disagree.
  const isVerified = (latestLot?.farmer?.status ?? "").toUpperCase() === "ACTIVE";

  return (
    <section className="page-wrap farmer-desk-page">
      <div className="farmer-desk-head">
        <div>
          <h1>
            {t("Farmer desk")}
            {user?.name ? ` · ${user.name}` : ""}
          </h1>
          <FarmerDeskBadge district={latestLot?.district?.name ?? ""} verified={isVerified} />
        </div>
        <button className="primary-button danger-button desk-post-button" type="button" onClick={() => navigate("/farmer/post")}>
          <Plus aria-hidden="true" size={18} />
          {t("Post a crop")}
        </button>
      </div>

      {error ? <p className="marketplace-feedback warning">{t(error)}</p> : null}
      {isLoading ? <ListLoading label={t("Loading your desk...")} /> : null}

      <FarmerEscrowKpis activeListings={activeLots.length} listedMon={listedMon} summary={escrow} user={user} />

      <div className="farmer-desk-columns">
        <FarmerListingsVsMarket
          lots={summaries}
          offerCounts={offerCounts}
          onEditLot={(id) => navigate(`/farmer/listings/${encodeURIComponent(id)}`)}
          onPostCrop={() => navigate("/farmer/post")}
        />
        <FarmerOffersPanel user={user} />
      </div>
    </section>
  );
}
