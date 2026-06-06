import { ShoppingBag, Sprout, X } from "lucide-react";
import { useTranslate } from "../i18n";
import type { RegistrationRole } from "../types";

export function RegisterChoiceModal({
  onChoose,
  onClose,
}: {
  onChoose: (role: RegistrationRole) => void;
  onClose: () => void;
}) {
  const t = useTranslate();

  return (
    <div className="admin-modal-backdrop auth-choice-backdrop" role="presentation" onClick={onClose}>
      <div className="admin-modal auth-choice-modal" role="dialog" aria-modal="true" aria-labelledby="registration-choice-title" onClick={(event) => event.stopPropagation()}>
        <div className="admin-modal-header">
          <div>
            <span>{t("Create account")}</span>
            <h2 id="registration-choice-title">{t("Do you want to buy or sell?")}</h2>
          </div>
          <button className="icon-button" type="button" aria-label={t("Close modal")} onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <div className="auth-choice-grid">
          <button className="auth-choice-card" type="button" onClick={() => onChoose("buyer")}>
            <span className="auth-choice-icon">
              <ShoppingBag size={22} />
            </span>
            <strong>{t("I want to buy crops")}</strong>
            <em>{t("Create a buyer account to order from verified farmers.")}</em>
          </button>
          <button className="auth-choice-card" type="button" onClick={() => onChoose("farmer")}>
            <span className="auth-choice-icon">
              <Sprout size={22} />
            </span>
            <strong>{t("I want to sell crops")}</strong>
            <em>{t("Create a seller account to post harvest lots.")}</em>
          </button>
        </div>
      </div>
    </div>
  );
}
