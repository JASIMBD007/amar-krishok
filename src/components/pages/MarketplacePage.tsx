import { ChevronDown, MapPin, Search } from "lucide-react";
import { useTranslate, useValueText } from "../../i18n";
import type { AuthUser, CropLot, View } from "../../types";
import { CropCard, SectionTitle } from "../shared";

export function MarketplacePage({
  district,
  districtOptions,
  error,
  filteredLots,
  isLoading,
  query,
  setDistrict,
  setQuery,
  setView,
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
  setView: (view: View) => void;
  currentUser?: AuthUser | null;
  onEditLot: (lot: CropLot) => void;
}) {
  const t = useTranslate();
  const v = useValueText();
  return (
    <section className="page-wrap">
      <SectionTitle eyebrow="Marketplace" title="Search crops by location and reserve directly from farmers." t={t} />
      <div className="filter-bar">
        <label className="search-field">
          <Search size={18} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t("Search tomato, potato, farmer...")} />
        </label>
        <label className="select-field">
          <MapPin size={18} />
          <select value={district} onChange={(event) => setDistrict(event.target.value)}>
            <option value="All districts">{t("All districts")}</option>
            {districtOptions.map((option) => (
              <option key={option} value={option}>{t(option)}</option>
            ))}
          </select>
          <ChevronDown size={16} />
        </label>
      </div>
      {isLoading && <p className="marketplace-feedback">{t("Loading marketplace lots...")}</p>}
      {error && <p className="marketplace-feedback warning">{t(error)}</p>}
      {!isLoading && filteredLots.length === 0 && <p className="empty-table-note">{t("No crop lots found")}</p>}
      <div className="listing-grid market-grid">
        {filteredLots.map((lot) => (
          <CropCard
            canEdit={Boolean(
              currentUser?.role === "farmer" &&
                ((lot.farmerId && lot.farmerId === currentUser.accountId) ||
                  (lot.farmerPhone && lot.farmerPhone === currentUser.phone)),
            )}
            lot={lot}
            key={lot.id}
            onEdit={() => onEditLot(lot)}
            onOrder={() => setView("buyer")}
            t={t}
            v={v}
          />
        ))}
      </div>
    </section>
  );
}
