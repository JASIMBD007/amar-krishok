import { prices } from "../../data";
import { useTranslate, useValueText } from "../../i18n";
import { SectionTitle } from "../shared";

export function PricesPage() {
  const t = useTranslate();
  const v = useValueText();
  return (
    <section className="page-wrap">
      <SectionTitle eyebrow="Market prices" title="Daily farmer, wholesale, and retail price signals." t={t} />
      <div className="price-table panel">
        {prices.map((price) => (
          <div className="price-row" key={`${price.crop}-${price.district}`}>
            <div>
              <strong>{t(price.crop)}</strong>
              <span>{t(price.district)}</span>
            </div>
            <div>
              <span>{t("Farmer ask")}</span>
              <strong>{v(`${price.farmerAsk}/kg`)}</strong>
            </div>
            <div>
              <span>{t("Wholesale")}</span>
              <strong>{v(`${price.wholesale}/kg`)}</strong>
            </div>
            <div>
              <span>{t("Retail")}</span>
              <strong>{v(`${price.retail}/kg`)}</strong>
            </div>
            <em>{v(price.trend)}</em>
          </div>
        ))}
      </div>
    </section>
  );
}
