import { NavLink } from "react-router-dom";
import { useTranslate } from "../i18n";
import { openCookiePreferences } from "../privacy/cookieConsent";
import { BrandMark } from "./BrandMark";

/** Internal routes get a link; the rest are plain labels until those pages exist. */
type FooterLink = { action?: "cookie-settings"; label: string; to?: string };

const COLUMNS: Array<{ heading: string; links: FooterLink[] }> = [
  {
    heading: "Farmers",
    links: [
      { label: "Post a crop", to: "/farmer" },
      { label: "Market rates", to: "/prices" },
      { label: "Payouts", to: "/farmer" },
    ],
  },
  {
    heading: "Buyers",
    links: [
      { label: "Marketplace", to: "/marketplace" },
      { label: "My orders", to: "/orders" },
      { label: "Escrow" },
      { label: "Logistics" },
    ],
  },
  {
    heading: "Company",
    links: [
      { label: "About" },
      { label: "Field agents" },
      { label: "Contact" },
      { action: "cookie-settings", label: "Cookie" },
    ],
  },
];

export function SiteFooter() {
  const t = useTranslate();

  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <div className="site-footer-brand">
          <NavLink className="site-footer-mark" to="/" aria-label={t("AmarKrishok home")} end>
            <BrandMark className="site-footer-logo" />
            <strong>AmarKrishok</strong>
          </NavLink>
          <p>{t("AmarKrishok (আমার কৃষক) is Bangladesh's direct farmer-to-buyer crop marketplace. Fair crop prices, visible to everyone.")}</p>
        </div>

        <div className="site-footer-columns">
          {COLUMNS.map((column) => (
            <nav aria-label={t(column.heading)} key={column.heading}>
              <span className="site-footer-heading">{t(column.heading)}</span>
              {column.links.map((link) =>
                link.action === "cookie-settings" ? (
                  <button
                    className="site-footer-cookie-button"
                    key={link.label}
                    onClick={openCookiePreferences}
                    type="button"
                  >
                    {t(link.label)}
                  </button>
                ) : link.to ? (
                  <NavLink key={link.label} to={link.to}>
                    {t(link.label)}
                  </NavLink>
                ) : (
                  <span key={link.label}>{t(link.label)}</span>
                ),
              )}
            </nav>
          ))}
        </div>
      </div>
    </footer>
  );
}
