import { AlertTriangle, BadgeCheck, Clock3, PackageSearch, Pencil, Trash2, X, XCircle } from "lucide-react";
import type { AdminAccountPayload } from "../../../api/auth";
import { useTranslate, useValueText } from "../../../i18n";
import type { AccountStatus, RegisteredAccount, RegisteredCropLotRecord, RegistrationRole } from "../../../types";
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

function formatPricePerKg(value?: number) {
  return `৳${Math.round(value ?? 0).toLocaleString("en-US")}/kg`;
}

function formatLotDate(value?: string) {
  if (!value) {
    return "Not added";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Not added";
  }

  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatLotStatus(value?: string) {
  if (!value) {
    return "ACTIVE";
  }

  return value.toUpperCase();
}

function formatLotGrade(value?: string) {
  if (!value) {
    return "Not added";
  }

  return value.toLowerCase().startsWith("grade ") ? value : `Grade ${value}`;
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

function LotDetailCard({ lot }: { lot: RegisteredCropLotRecord }) {
  const t = useTranslate();
  const v = useValueText();

  return (
    <article className="lot-detail-card">
      <header>
        <div>
          <span>
            {t("Lot ID")}: {lot.id}
          </span>
          <h3>{t(lot.crop)}</h3>
        </div>
        <em>{t(formatLotStatus(lot.status))}</em>
      </header>
      <div className="lot-detail-meta">
        <span>
          <small>{t("District")}</small>
          <strong>{t(lot.district || "Not added")}</strong>
        </span>
        <span>
          <small>{t("Upazilla")}</small>
          <strong>{lot.upazilla || t("Not added")}</strong>
        </span>
        <span>
          <small>{t("Quantity")}</small>
          <strong>{t(formatQuantityKg(lot.quantityKg))}</strong>
        </span>
        <span>
          <small>{t("Price per kg")}</small>
          <strong>{v(formatPricePerKg(lot.pricePerKg))}</strong>
        </span>
        <span>
          <small>{t("Grade")}</small>
          <strong>{t(formatLotGrade(lot.grade))}</strong>
        </span>
        <span>
          <small>{t("Harvest date")}</small>
          <strong>{t(formatLotDate(lot.harvestDate))}</strong>
        </span>
      </div>
      {lot.notes && <p className="lot-detail-notes">{lot.notes}</p>}
      {lot.imageUrl && (
        <a className="lot-detail-link" href={lot.imageUrl} target="_blank" rel="noreferrer">
          {t("View crop image")}
        </a>
      )}
    </article>
  );
}

export function FarmerLotDetailsModal({
  account,
  onClose,
}: {
  account: RegisteredAccount | null;
  onClose: () => void;
}) {
  const t = useTranslate();
  const v = useValueText();

  if (!account) {
    return null;
  }

  const lots = account.cropLots ?? [];

  return (
    <div className="admin-modal-backdrop" role="presentation">
      <section className="admin-modal lot-details-modal" role="dialog" aria-modal="true" aria-labelledby="farmer-lot-details-title">
        <div className="admin-modal-header">
          <div>
            <span>{t("Farmer lot details")}</span>
            <h2 id="farmer-lot-details-title">{account.name}</h2>
          </div>
          <button className="icon-button" type="button" aria-label={t("Close modal")} onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <div className="lot-details-summary">
          <PackageSearch size={22} />
          <span>
            {t("Mobile number")}: <strong>{account.phone}</strong>
          </span>
          <span>
            {t("Lots")}: <strong>{v(account.cropLotCount ?? lots.length)}</strong>
          </span>
          <span>
            {t("Quantity")}: <strong>{t(formatQuantityKg(account.cropLotQuantityKg))}</strong>
          </span>
        </div>
        {lots.length === 0 ? (
          <p className="empty-table-note">{t("No crop lots found")}</p>
        ) : (
          <div className="lot-details-list">
            {lots.map((lot) => (
              <LotDetailCard key={lot.id} lot={lot} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export function AccountDirectoryTable({
  accounts,
  emptyText,
  onDelete,
  onEdit,
  onOpenLotRecords,
  onUpdateRegistration,
  role,
}: {
  accounts: RegisteredAccount[];
  emptyText: string;
  onDelete: (account: RegisteredAccount) => void;
  onEdit: (account: RegisteredAccount) => void;
  onOpenLotRecords?: (account: RegisteredAccount) => void;
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
            <th>{t("Mobile number")}</th>
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
              <td colSpan={8}>
                <em className="empty-table-note">{t(emptyText)}</em>
              </td>
            </tr>
          )}
          {accounts.map((account) => (
            <tr key={account.id}>
              <td>
                <strong>{account.name}</strong>
                <span>@{account.username}</span>
              </td>
              <td className="account-mobile-cell">{account.phone || t("Not added")}</td>
              <td>{account.organization || t("Business not added")}</td>
              <td>
                <strong>{account.district || t("District not added")}</strong>
                <span>{account.upazilla || t("Upazilla not added")}</span>
              </td>
              <td>{account.focus || t(isBuyer ? "Demand focus not added" : "Supply focus not added")}</td>
              <td>
                {isBuyer ? (
                  <div className="account-record-cell">
                    <span>{t("Orders")}: {v(account.orderCount ?? 0)}</span>
                    <small>{t("Value")}: {v(`৳${Math.round(account.orderValue ?? 0).toLocaleString("en-US")}`)}</small>
                  </div>
                ) : (
                  <button
                    className="account-record-cell record-cell-button"
                    type="button"
                    aria-label={`${t("Open lot details")}: ${account.name}`}
                    onClick={() => onOpenLotRecords?.(account)}
                  >
                    <span>{t("Lots")}: {v(account.cropLotCount ?? 0)}</span>
                    <small>{t("Quantity")}: {t(formatQuantityKg(account.cropLotQuantityKg))}</small>
                  </button>
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
