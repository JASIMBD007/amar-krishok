import { NavLink } from "react-router-dom";
import { Clock3, ClipboardCheck, HeartHandshake, Leaf, ShieldCheck, ShoppingBag, Sprout, Truck, WalletCards } from "lucide-react";
import { lots } from "../../data";
import { useTranslate, useValueText } from "../../i18n";
import { cheapestVsMarket } from "../../market/deriveLots";
import { useMarketLots } from "../../market/useMarket";
import type { View } from "../../types";
import { DeltaPill } from "../market/MarketBits";

export function HomePage({ setView }: { setView: (view: View) => void }) {
  const t = useTranslate();
  const v = useValueText();
  const marketLots = useMarketLots(lots);
  const cheapestLots = cheapestVsMarket(marketLots, 3);

  return (
    <>
      <section className="hero-section">
        <div className="hero-copy">
          <div className="status-pill">
            <ShieldCheck size={16} />
            {t("Verified farmer-to-buyer marketplace")}
          </div>
          <h1>{t("Farmers post crops. Buyers order directly. We will manage the chain.")}</h1>
          <p>
            {t("A direct supply-chain platform for Bangladesh where farmers post harvests, buyers order transparently, logistics partners deliver, and payments stay protected.")}
          </p>
          <div className="hero-actions">
            <button className="primary-button" type="button" onClick={() => setView("market")}>
              {t("Browse crops")}
            </button>
            <button className="secondary-button large" type="button" onClick={() => setView("farmer")}>
              {t("Post a crop")}
            </button>
          </div>
        </div>

        <div className="market-console">
          <div className="console-header">
            <div>
              <span>{t("Today's supply")}</span>
              <strong>{t("Cheapest lots right now")}</strong>
            </div>
            <NavLink className="link-button" to="/marketplace">
              {t("See all")}
            </NavLink>
          </div>
          {/* Cheapest against their own district rate — the fair-price claim, proven before signup. */}
          <div className="cheapest-lots">
            {cheapestLots.map((lot) => (
              <NavLink className="cheapest-lot" key={lot.id} to={`/lot/${lot.id}`}>
                <span className="cheapest-lot-tile" aria-hidden="true">
                  <Leaf size={19} />
                </span>
                <span className="cheapest-lot-copy">
                  <strong>
                    {t(lot.crop)} · {t("Grade")} {v(lot.grade)}
                  </strong>
                  <small>
                    {t(lot.farmer)} · {t(lot.district)} · {v(lot.quantityMon)} {t("mon")}
                  </small>
                </span>
                <span className="cheapest-lot-price">
                  <strong className="mono-figure">{v(lot.priceLabel)}</strong>
                  <DeltaPill delta={lot.delta} withSuffix />
                </span>
              </NavLink>
            ))}
          </div>
          <p className="console-escrow-note">
            <ShieldCheck aria-hidden="true" size={18} />
            {t("Every order is paid into escrow and released after the buyer confirms delivery.")}
          </p>
        </div>
      </section>

      <section className="metrics-band" aria-label={t("Platform metrics")}>
        <div>
          <strong>{v("27.4 tons")}</strong>
          <span>{t("active verified supply")}</span>
        </div>
        <div>
          <strong>{v("18")}</strong>
          <span>{t("orders confirmed today")}</span>
        </div>
        <div>
          <strong>{v("16.8%")}</strong>
          <span>{t("average farmer price lift")}</span>
        </div>
        <div>
          <strong>{v("৳82K")}</strong>
          <span>{t("escrow pending release")}</span>
        </div>
      </section>

      <section className="workflow-section">
        {[
          { icon: Sprout, title: "Farmer posts crop", text: "Crop, district, quantity, grade, harvest date, and asking price." },
          { icon: ShoppingBag, title: "Buyer orders", text: "Retailers and restaurants reserve lots or request bulk supply." },
          { icon: Truck, title: "Logistics runs", text: "Pickup, delivery, and proof stay visible to all parties." },
          { icon: WalletCards, title: "Admin releases payout", text: "Escrow protects buyers and pays farmers after confirmation." },
        ].map((step) => {
          const Icon = step.icon;
          return (
            <article className="workflow-card" key={step.title}>
              <Icon size={24} />
              <h3>{t(step.title)}</h3>
              <p>{t(step.text)}</p>
            </article>
          );
        })}
      </section>

      <section className="trust-section" id="trust">
        <div className="trust-panel">
          <div className="section-title trust-title">
            <span>{t("Trust layer")}</span>
            <h1>{t("Quality, payment, and delivery stay visible.")}</h1>
            <p>
              {t("AmarKrishok reduces middleman abuse by keeping lot grading, escrow status, buyer history, and delivery proof in one shared record.")}
            </p>
          </div>

          <div className="trust-list">
            <div>
              <ClipboardCheck size={20} />
              <span>{t("Digital quality checklist before pickup")}</span>
            </div>
            <div>
              <Clock3 size={20} />
              <span>{t("Delivery milestones with buyer confirmation")}</span>
            </div>
            <div>
              <HeartHandshake size={20} />
              <span>{t("Farmer co-op groups for bulk orders")}</span>
            </div>
          </div>
        </div>

        <aside className="buyer-card" aria-label={t("Buyer request")}>
          <div className="buyer-card-header">
            <ShoppingBag size={22} />
            <span>{t("Buyer request")}</span>
          </div>
          <h3>{t("Need 2 tons tomato for Dhaka retail chain")}</h3>
          <p>{t("Preferred delivery: next morning. Escrow ready after lot approval.")}</p>
          <button className="primary-button full" type="button" onClick={() => setView("buyer")}>
            {t("Match farmers")}
          </button>
        </aside>
      </section>
    </>
  );
}
