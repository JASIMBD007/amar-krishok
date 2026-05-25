import { CheckCircle2, Clock3, Plus, UserRoundCheck } from "lucide-react";
import { useTranslate } from "../../i18n";
import { FormGrid, Input, SectionTitle } from "../shared";

export function PostCropPage() {
  const t = useTranslate();
  return (
    <section className="page-wrap form-layout">
      <SectionTitle eyebrow="Farmer app" title="Post a crop lot for direct buyer orders." t={t} />
      <form className="panel form-panel">
        <FormGrid>
          <Input label="Crop name" placeholder="Tomato" t={t} />
          <Input label="District" placeholder="Jashore" t={t} />
          <Input label="Quantity" placeholder="1.2 tons" t={t} />
          <Input label="Expected price" placeholder="৳34/kg" t={t} />
          <Input label="Harvest date" placeholder="Tomorrow morning" t={t} />
          <Input label="Grade" placeholder="A / B+ / C" t={t} />
        </FormGrid>
        <label className="full-field">
          <span>{t("Notes")}</span>
          <textarea placeholder={t("Packaging, pickup point, storage condition...")} />
        </label>
        <button className="primary-button full" type="button">
          <Plus size={18} />
          {t("Publish crop lot")}
        </button>
      </form>
      <aside className="panel side-panel">
        <UserRoundCheck size={24} />
        <h3>{t("Farmer profile readiness")}</h3>
        <p>{t("Phone OTP, NID, farm location, and bank/mobile wallet details should be verified before payout.")}</p>
        <div className="checklist">
          <span><CheckCircle2 size={18} /> {t("Phone verified")}</span>
          <span><CheckCircle2 size={18} /> {t("Farm location added")}</span>
          <span><Clock3 size={18} /> {t("Wallet verification pending")}</span>
        </div>
      </aside>
    </section>
  );
}
