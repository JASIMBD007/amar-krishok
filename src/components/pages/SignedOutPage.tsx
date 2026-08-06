import { Link } from "react-router-dom";
import { Check } from "lucide-react";
import { useTranslate } from "../../i18n";

/**
 * Where logging out lands. The reassurance matters: escrow keeps running without a session, so the
 * page says plainly that nothing about the money changed.
 */
export function SignedOutPage() {
  const t = useTranslate();

  return (
    <section className="page-wrap order-placed-page">
      <span className="order-placed-check" aria-hidden="true">
        <Check size={26} />
      </span>
      <h1>{t("You are signed out")}</h1>
      <p>
        {t("Your orders and escrow balances stay exactly as they are. Market rates are open to everyone, no login needed.")}
      </p>
      <div className="order-placed-actions">
        <Link className="primary-button" to="/login">
          {t("Log in again")}
        </Link>
        <Link className="secondary-button large" to="/prices">
          {t("See today's rates")}
        </Link>
      </div>
    </section>
  );
}
