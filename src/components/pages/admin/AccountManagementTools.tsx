import { AlertTriangle, BadgeCheck, Clock3, Pencil, Trash2, X, XCircle } from "lucide-react";
import type { AdminAccountPayload } from "../../../api/auth";
import { useTranslate, useValueText } from "../../../i18n";
import type { AccountStatus, RegisteredAccount, RegistrationRole } from "../../../types";
import { AccountManagementForm } from "./AccountManagementForm";

export type AdminToast = {
  message: string;
  tone: "success" | "error";
};

function formatQuantityKg(value?: number) {
  if (!value) {
    return "0 kg";
  }

  if (value >= 1000) {
    return `${(value / 1000).toFixed(value % 1000 === 0 ? 0 : 1)} tons`;
  }

  return `${value.toLocaleString("en-US")} kg`;
}

function accountStatusIcon(status: AccountStatus) {
  if (status === "active") {
    return <BadgeCheck size={16} />;
  }

  if (status === "pending") {
    return <Clock3 size={16} />;
  }

  return <XCircle size={16} />;
}

export function AdminSnackbar({ onClose, toast }: { onClose: () => void; toast: AdminToast | null }) {
  const t = useTranslate();

  if (!toast) {
    return null;
  }

  return (
    <div className={`admin-snackbar ${toast.tone}`} role="status">
      <span>{t(toast.message)}</span>
      <button type="button" aria-label={t("Close notification")} onClick={onClose}>
        <X size={16} />
      </button>
    </div>
  );
}

export function AccountModal({
  editingAccount,
  onClose,
  onCreateAccount,
  onNotify,
  onUpdateAccount,
  open,
  role,
}: {
  editingAccount: RegisteredAccount | null;
  onClose: () => void;
  onCreateAccount: (payload: AdminAccountPayload) => Promise<void>;
  onNotify: (toast: AdminToast) => void;
  onUpdateAccount: (id: string, payload: Partial<AdminAccountPayload>) => Promise<void>;
  open: boolean;
  role: RegistrationRole;
}) {
  const t = useTranslate();

  if (!open) {
    return null;
  }

  return (
    <div className="admin-modal-backdrop" role="presentation">
      <section className="admin-modal" role="dialog" aria-modal="true" aria-labelledby={`${role}-account-modal-title`}>
        <div className="admin-modal-header">
          <div>
            <span>{t(editingAccount ? "Edit account" : "Create account")}</span>
            <h2 id={`${role}-account-modal-title`}>{t(role === "buyer" ? "Buyer / customer" : "Seller / farmer")}</h2>
          </div>
          <button className="icon-button" type="button" aria-label={t("Close modal")} onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <AccountManagementForm
          editingAccount={editingAccount}
          onCreateAccount={onCreateAccount}
          onDone={(message) => {
            onNotify({ message, tone: "success" });
            onClose();
          }}
          onError={(message) => onNotify({ message, tone: "error" })}
          onUpdateAccount={onUpdateAccount}
          role={role}
        />
      </section>
    </div>
  );
}

export function DeleteConfirmModal({
  account,
  isDeleting,
  onClose,
  onConfirm,
}: {
  account: RegisteredAccount | null;
  isDeleting: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const t = useTranslate();

  if (!account) {
    return null;
  }

  return (
    <div className="admin-modal-backdrop" role="presentation">
      <section className="admin-modal confirm-modal" role="dialog" aria-modal="true" aria-labelledby="delete-account-title">
        <div className="admin-modal-header">
          <div>
            <span>{t("Delete confirmation")}</span>
            <h2 id="delete-account-title">{t("Delete account")}</h2>
          </div>
          <button className="icon-button" type="button" aria-label={t("Close modal")} onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <div className="confirm-modal-body">
          <AlertTriangle size={26} />
          <p>{t("Are you sure you want to delete this account?")}</p>
          <strong>{account.name}</strong>
          <span>{account.phone}</span>
        </div>
        <div className="confirm-modal-actions">
          <button className="secondary-button" type="button" onClick={onClose} disabled={isDeleting}>
            {t("No")}
          </button>
          <button className="primary-button danger-button" type="button" onClick={onConfirm} disabled={isDeleting}>
            <Trash2 size={17} />
            {t("Yes, delete")}
          </button>
        </div>
      </section>
    </div>
  );
}

export function AccountDirectoryTable({
  accounts,
  emptyText,
  onDelete,
  onEdit,
  onUpdateRegistration,
  role,
}: {
  accounts: RegisteredAccount[];
  emptyText: string;
  onDelete: (account: RegisteredAccount) => void;
  onEdit: (account: RegisteredAccount) => void;
  onUpdateRegistration: (id: string, status: AccountStatus) => void;
  role: RegistrationRole;
}) {
  const t = useTranslate();
  const v = useValueText();
  const isBuyer = role === "buyer";

  return (
    <div className="table-wrap account-table-wrap">
      <table className="account-table">
        <thead>
          <tr>
            <th>{t("Name")}</th>
            <th>{t("Business / farm name")}</th>
            <th>{t("District")}</th>
            <th>{t("Focus")}</th>
            <th>{t(isBuyer ? "Order records" : "Lot records")}</th>
            <th>{t("Status")}</th>
            <th>{t("Actions")}</th>
          </tr>
        </thead>
        <tbody>
          {accounts.length === 0 && (
            <tr>
              <td colSpan={7}>
                <em className="empty-table-note">{t(emptyText)}</em>
              </td>
            </tr>
          )}
          {accounts.map((account) => (
            <tr key={account.id}>
              <td>
                <strong>{account.name}</strong>
                <span>{account.phone}</span>
              </td>
              <td>{account.organization || t("Business not added")}</td>
              <td>{account.district || t("District not added")}</td>
              <td>{account.focus || t(isBuyer ? "Demand focus not added" : "Supply focus not added")}</td>
              <td>
                {isBuyer ? (
                  <div className="account-record-cell">
                    <span>{t("Orders")}: {v(account.orderCount ?? 0)}</span>
                    <small>{t("Value")}: {v(`৳${Math.round(account.orderValue ?? 0).toLocaleString("en-US")}`)}</small>
                  </div>
                ) : (
                  <div className="account-record-cell">
                    <span>{t("Lots")}: {v(account.cropLotCount ?? 0)}</span>
                    <small>{t("Quantity")}: {t(formatQuantityKg(account.cropLotQuantityKg))}</small>
                  </div>
                )}
              </td>
              <td>
                <div className={`account-status-chip ${account.status}`}>
                  {accountStatusIcon(account.status)}
                  {t(account.status)}
                </div>
              </td>
              <td>
                <div className="table-actions">
                  {account.status === "pending" && (
                    <>
                      <button className="secondary-button compact-action" type="button" onClick={() => onUpdateRegistration(account.id, "rejected")}>
                        {t("Reject")}
                      </button>
                      <button className="primary-button compact-action" type="button" onClick={() => onUpdateRegistration(account.id, "active")}>
                        {t("Approve")}
                      </button>
                    </>
                  )}
                  <button className="secondary-button compact-action" type="button" onClick={() => onEdit(account)}>
                    <Pencil size={15} />
                    {t("Edit")}
                  </button>
                  <button className="secondary-button danger-button compact-action" type="button" onClick={() => onDelete(account)}>
                    <Trash2 size={15} />
                    {t("Delete")}
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
