import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import { BadgeCheck, Camera, Handshake, Leaf, ShieldCheck, ShoppingBasket, Sprout, Truck } from "lucide-react";
import { fetchPlatformStats, type BackendPlatformStats } from "../../api/market";
import { lots } from "../../data";
import { useLanguage, useTranslate, useValueText } from "../../i18n";
import { cheapestVsMarket } from "../../market/deriveLots";
import { cropNamesBn } from "../../market/marketData";
import { useMarketLots } from "../../market/useMarket";
import type { View } from "../../types";
import { DeltaPill } from "../market/MarketBits";

const STEPS = [
  {
    body: "Photos, quantity, grade. The district rate is shown while the price is set.",
    icon: Camera,
    title: "1 · Post the crop",
  },
  {
    body: "Buyers order or send an offer. Both sides see what similar lots closed at.",
    icon: Handshake,
    title: "2 · Agree the price",
  },
  {
    body: "A partner truck is assigned, weighed at pickup, tracked to the buyer's gate.",
    icon: Truck,
    title: "3 · We move it",
  },
  {
    body: "Paid to bKash or bank within hours of confirmed delivery.",
    icon: ShieldCheck,
    title: "4 · Money released",
  },
];

/** "1 h 48" rather than "108 minutes" — the shape the demo's stat block uses. */
function formatDuration(minutes: number) {
  const whole = Math.round(minutes);
  if (whole < 60) {
    return `${whole} min`;
  }

  return `${Math.floor(whole / 60)} h ${String(whole % 60).padStart(2, "0")}`;
}

export function HomePage({ setView }: { setView: (view: View) => void }) {
  const language = useLanguage();
  const t = useTranslate();
  const v = useValueText();
  const marketLots = useMarketLots(lots);
  const cheapestLots = cheapestVsMarket(marketLots, 3);
  const [stats, setStats] = useState<BackendPlatformStats | null>(null);

  useEffect(() => {
    let active = true;
    fetchPlatformStats()
      .then((result) => {
        if (active) {
          setStats(result);
        }
      })
      .catch(() => {
        // The hero drops to two stat blocks rather than showing invented numbers.
      });

    return () => {
      active = false;
    };
  }, []);

  const cropLabel = (crop: string) => (language === "bn" ? cropNamesBn[crop] ?? t(crop) : t(crop));

  return (
    <>
      <section className="hero-section">
        <div className="hero-copy">
          <span className="hero-eyebrow">
            <BadgeCheck aria-hidden="true" size={13} />
            {t("Verified farmers · protected payments")}
          </span>
          <h1>{t("Sell your harvest at today's real price.")}</h1>
          {/* The demo carries the Bangla line under the headline as a second voice, not a swap. */}
          {language === "bn" ? <span className="hero-subtitle-bn">আজকের সঠিক দামে ফসল বিক্রি করুন।</span> : null}
          <p>
            {t("Farmers post the crop, buyers order directly, and we hold the money until delivery is confirmed. Every price sits next to today's district rate.")}
          </p>
          <div className="hero-actions">
            <button className="primary-button" type="button" onClick={() => setView("farmer")}>
              <Sprout aria-hidden="true" size={19} />
              {t("I sell crops")}
            </button>
            <button className="secondary-button large" type="button" onClick={() => setView("market")}>
              <ShoppingBasket aria-hidden="true" size={19} />
              {t("I buy crops")}
            </button>
          </div>

          <div className="hero-stats">
            {stats ? (
              <div>
                <strong className="mono-figure">{v(stats.verifiedFarmers.toLocaleString("en-IN"))}</strong>
                <span>{t("verified farmers")}</span>
              </div>
            ) : null}
            {stats ? (
              <div>
                <strong className="mono-figure">{v(stats.marketsTracked)}</strong>
                <span>{t("markets tracked daily")}</span>
              </div>
            ) : null}
            {stats?.medianReleaseMinutes != null ? (
              <div>
                <strong className="mono-figure">{v(formatDuration(stats.medianReleaseMinutes))}</strong>
                <span>{t("median payout time")}</span>
              </div>
            ) : null}
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
                    {cropLabel(lot.crop)} · {t("Grade")} {v(lot.grade)}
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

      <section className="how-it-works">
        <div className="section-title">
          <span>{t("How it works")}</span>
          <h2>{t("Four steps, no negotiation in the dark")}</h2>
        </div>
        <div className="how-it-works-grid">
          {STEPS.map((step) => {
            const Icon = step.icon;
            return (
              <article className="how-card" key={step.title}>
                <span className="how-card-tile" aria-hidden="true">
                  <Icon size={20} />
                </span>
                <strong>{t(step.title)}</strong>
                <p>{t(step.body)}</p>
              </article>
            );
          })}
        </div>
      </section>
    </>
  );
}
