import { BadgeCheck, Clock3, MapPin, ShoppingBag, XCircle } from "lucide-react";
import { useTranslate, useValueText } from "../../../i18n";
import type { AccountStatus, RegisteredAccount } from "../../../types";

export function BuyersSection({
  onUpdateRegistration,
  registrations,
  verificationError,
}: {
  onUpdateRegistration: (id: string, status: AccountStatus) => void;
  registrations: RegisteredAccount[];
  verificationError?: string;
}) {
  const t = useTranslate();
  const v = useValueText();
  const buyers = registrations.filter((account) => account.role === "buyer");
  const pendingBuyers = buyers.filter((account) => account.status === "pending");
  const activeBuyers = buyers.filter((account) => account.status === "active");
  const rejectedBuyers = buyers.filter((account) => account.status === "rejected");

  return (
    <section className="dashboard-grid admin-focused-grid">
      <section className="panel verification-panel admin-wide-panel" aria-labelledby="buyers-heading">
        <div className="panel-header">
          <div>
            <span>{t("Buyer accounts")}</span>
            <h2 id="buyers-heading">{t("Registered buyers")}</h2>
          </div>
          <ShoppingBag size={22} />
        </div>
        <p className="panel-copy">{t("See buyer registrations, verification status, business details, and demand focus.")}</p>
        {verificationError && <p className="auth-error">{t(verificationError)}</p>}

        <div className="verification-stats">
          <span>
            <strong>{v(buyers.length)}</strong>
            {t("Total buyers")}
          </span>
          <span>
            <strong>{v(activeBuyers.length)}</strong>
            {t("Approved accounts")}
          </span>
          <span>
            <strong>{v(pendingBuyers.length)}</strong>
            {t("Pending verification")}
          </span>
          <span>
            <strong>{v(rejectedBuyers.length)}</strong>
            {t("Rejected accounts")}
          </span>
        </div>

        <div className="verification-list">
          {buyers.length === 0 && <em>{t("No buyer registrations yet")}</em>}
          {buyers.map((buyer) => (
            <article className="verification-item buyer-directory-item" key={buyer.id}>
              <div>
                <strong>{buyer.name}</strong>
                <span>{t("Buyer")}</span>
              </div>
              <div>
                <span>{buyer.organization || t("Business not added")}</span>
                <small>{buyer.phone}</small>
              </div>
              <p>
                <MapPin size={14} />
                {buyer.district || t("District not added")} · {buyer.focus || t("Demand focus not added")}
              </p>
              <div className="admin-data-line">
                <span className="admin-data-chip">{t("Order records")}: {v(buyer.orderCount ?? 0)}</span>
                <span className="admin-data-chip">{t("Value")}: {v(`৳${Math.round(buyer.orderValue ?? 0).toLocaleString("en-US")}`)}</span>
                {buyer.latestOrderSummary && <span className="admin-data-chip">{t("Latest order")}: {buyer.latestOrderSummary}</span>}
              </div>
              <div className={`account-status-chip ${buyer.status}`}>
                {buyer.status === "active" && <BadgeCheck size={16} />}
                {buyer.status === "pending" && <Clock3 size={16} />}
                {buyer.status === "rejected" && <XCircle size={16} />}
                {t(buyer.status)}
              </div>
              {buyer.status === "pending" && (
                <div className="verification-actions">
                  <button className="secondary-button" type="button" onClick={() => onUpdateRegistration(buyer.id, "rejected")}>
                    {t("Reject")}
                  </button>
                  <button className="primary-button" type="button" onClick={() => onUpdateRegistration(buyer.id, "active")}>
                    <BadgeCheck size={17} />
                    {t("Approve")}
                  </button>
                </div>
              )}
            </article>
          ))}
        </div>
      </section>
    </section>
  );
}
