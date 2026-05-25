import { ChevronDown, MapPin, Search } from "lucide-react";
import { useTranslate, useValueText } from "../../i18n";
import type { CropLot, View } from "../../types";
import { CropCard, SectionTitle } from "../shared";

export function MarketplacePage({
  district,
  filteredLots,
  query,
  setDistrict,
  setQuery,
  setView,
}: {
  district: string;
  filteredLots: CropLot[];
  query: string;
  setDistrict: (value: string) => void;
  setQuery: (value: string) => void;
  setView: (view: View) => void;
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
            <option value="Jashore">{t("Jashore")}</option>
            <option value="Bogura">{t("Bogura")}</option>
            <option value="Rangpur">{t("Rangpur")}</option>
            <option value="Pabna">{t("Pabna")}</option>
            <option value="Kushtia">{t("Kushtia")}</option>
          </select>
          <ChevronDown size={16} />
        </label>
      </div>
      <div className="listing-grid market-grid">
        {filteredLots.map((lot) => (
          <CropCard lot={lot} key={lot.id} onOrder={() => setView("buyer")} t={t} v={v} />
        ))}
      </div>
    </section>
  );
}
