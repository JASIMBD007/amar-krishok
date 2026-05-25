import { ShoppingBag, Store } from "lucide-react";
import { useTranslate } from "../../i18n";
import { FormGrid, Input, SectionTitle } from "../shared";

export function OrderPage() {
  const t = useTranslate();
  return (
    <section className="page-wrap form-layout">
      <SectionTitle eyebrow="Buyer order" title="Place a direct order or bulk request." t={t} />
      <form className="panel form-panel">
        <FormGrid>
          <Input label="Buyer name" placeholder="Restaurant / retailer / family group" t={t} />
          <Input label="Crop needed" placeholder="Tomato" t={t} />
          <Input label="Quantity" placeholder="2 tons" t={t} />
          <Input label="Delivery area" placeholder="Dhaka North" t={t} />
          <Input label="Target date" placeholder="Tomorrow 8 AM" t={t} />
          <Input label="Offer price" placeholder="৳42/kg" t={t} />
        </FormGrid>
        <label className="full-field">
          <span>{t("Quality requirement")}</span>
          <textarea placeholder={t("Grade, packaging, ripeness, delivery notes...")} />
        </label>
        <button className="primary-button full" type="button">
          <ShoppingBag size={18} />
          {t("Submit order request")}
        </button>
      </form>
      <aside className="panel side-panel">
        <Store size={24} />
        <h3>{t("Matched supply")}</h3>
        <p>{t("Current best match: 3 verified tomato lots from Jashore, total 2.9 tons.")}</p>
        <button className="secondary-button full" type="button">{t("View matched lots")}</button>
      </aside>
    </section>
  );
}
