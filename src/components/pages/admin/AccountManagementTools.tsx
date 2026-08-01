import { useEffect, useState, type FormEvent } from "react";
import { AlertTriangle, BadgeCheck, CheckCircle2, Clock3, ImageIcon, PackageSearch, Pencil, Power, Save, Trash2, X, XCircle } from "lucide-react";
import type { AdminAccountPayload, CropLotStatusUpdate, UpdateCropLotPayload } from "../../../api/auth";
import { getUpazillasForDistrict, serviceDistricts } from "../../../data";
import { useTranslate, useValueText } from "../../../i18n";
import type { AccountStatus, RegisteredAccount, RegisteredCropLotRecord, RegistrationRole } from "../../../types";
import { FormGrid } from "../../shared";
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
  const status = value?.toUpperCase();
  if (status === "DRAFT") {
    return "Pending approval";
  }

  if (status === "CANCELLED") {
    return "Rejected";
  }

  if (status === "RESERVED") {
    return "Reserved";
  }

  if (status === "SOLD") {
    return "Sold";
  }

  return "Active";
}

function formatLotGrade(value?: string) {
  if (!value) {
    return "Not added";
  }

  return value.toLowerCase().startsWith("grade ") ? value : `Grade ${value}`;
}

function lotRecordToEditForm(lot: RegisteredCropLotRecord) {
  return {
    crop: lot.crop,
    district: lot.district,
    grade: lot.grade,
    harvestDate: lot.harvestDate ? lot.harvestDate.slice(0, 10) : "",
    notes: lot.notes ?? "",
    pricePerKg: String(lot.pricePerKg || ""),
    quantityKg: String(lot.quantityKg || ""),
    upazilla: lot.upazilla ?? "",
  };
}

function buildLotUpdatePayload(form: ReturnType<typeof lotRecordToEditForm>): UpdateCropLotPayload {
  return {
    crop: form.crop.trim(),
    district: form.district.trim(),
    grade: form.grade.trim(),
    harvestDate: form.harvestDate || undefined,
    notes: form.notes.trim() || undefined,
    pricePerKg: Number(form.pricePerKg),
    quantityKg: Number(form.quantityKg),
    upazilla: form.upazilla.trim(),
  };
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
  accessToken,
  editingAccount,
  onClose,
  onCreateAccount,
  onNotify,
  onUpdateAccount,
  open,
  role,
}: {
  accessToken?: string;
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
          accessToken={accessToken}
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

function LotDetailCard({
  fallbackUpazilla,
  isReviewing,
  isStatusUpdating,
  lot,
  onEditLot,
  onNotify,
  onReviewLot,
  onUpdateLotStatus,
}: {
  fallbackUpazilla?: string;
  isReviewing: boolean;
  isStatusUpdating: boolean;
  lot: RegisteredCropLotRecord;
  onEditLot: (lot: RegisteredCropLotRecord) => void;
  onNotify?: (toast: AdminToast) => void;
  onReviewLot?: (lotId: string, action: "approve" | "reject") => Promise<void>;
  onUpdateLotStatus?: (lotId: string, status: CropLotStatusUpdate) => Promise<void>;
}) {
  const t = useTranslate();
  const v = useValueText();
  const displayUpazilla = lot.upazilla || fallbackUpazilla;
  const isPendingApproval = lot.status.toUpperCase() === "DRAFT";
  const isActive = lot.status.toUpperCase() === "ACTIVE";

  const reviewLot = async (action: "approve" | "reject") => {
    if (!onReviewLot) {
      return;
    }

    try {
      await onReviewLot(lot.id, action);
      onNotify?.({ message: action === "approve" ? "Lot approved." : "Lot rejected.", tone: "success" });
    } catch (error) {
      onNotify?.({ message: error instanceof Error ? error.message : "Lot review failed.", tone: "error" });
    }
  };

  const updateStatus = async () => {
    if (!onUpdateLotStatus) {
      return;
    }

    try {
      await onUpdateLotStatus(lot.id, isActive ? "CANCELLED" : "ACTIVE");
      onNotify?.({ message: isActive ? "Lot deactivated." : "Lot activated.", tone: "success" });
    } catch (error) {
      onNotify?.({ message: error instanceof Error ? error.message : "Lot status update failed.", tone: "error" });
    }
  };

  return (
    <article className="lot-detail-card">
      <header>
        <div>
          <span>
            {t("Lot ID")}: {lot.id}
          </span>
          <h3>{t(lot.crop)}</h3>
        </div>
        <div className="lot-detail-status-actions">
          <em>{t(formatLotStatus(lot.status))}</em>
          <div className="lot-review-actions">
            <button className="secondary-button compact-action" type="button" onClick={() => onEditLot(lot)}>
              <Pencil size={15} />
              {t("Edit")}
            </button>
            {onUpdateLotStatus && (
              <button className={`secondary-button compact-action ${isActive ? "danger-button" : ""}`} type="button" disabled={isStatusUpdating} onClick={updateStatus}>
                <Power size={15} />
                {t(isActive ? "Deactivate" : "Activate")}
              </button>
            )}
            {isPendingApproval && onReviewLot && (
              <>
              <button className="secondary-button danger-button compact-action" type="button" disabled={isReviewing} onClick={() => reviewLot("reject")}>
                <XCircle size={15} />
                {t("Reject lot")}
              </button>
              <button className="primary-button compact-action" type="button" disabled={isReviewing} onClick={() => reviewLot("approve")}>
                <CheckCircle2 size={15} />
                {t("Approve lot")}
              </button>
              </>
            )}
          </div>
        </div>
      </header>
      <div className="lot-detail-body">
        <div className="lot-detail-meta">
          <span>
            <small>{t("District")}</small>
            <strong>{t(lot.district || "Not added")}</strong>
          </span>
          <span>
            <small>{t("Upazilla")}</small>
            <strong>{displayUpazilla ? t(displayUpazilla) : t("Not added")}</strong>
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
        <div className="lot-detail-image">
          {lot.imageUrl ? (
            <img src={lot.imageUrl} alt={`${t(lot.crop)} ${t("crop image")}`} />
          ) : (
            <div className="lot-detail-image-empty">
              <ImageIcon size={24} />
              <span>{t("No crop image")}</span>
            </div>
          )}
        </div>
      </div>
      {lot.notes && <p className="lot-detail-notes">{lot.notes}</p>}
    </article>
  );
}

function LotEditModal({
  isSaving,
  lot,
  onClose,
  onSave,
}: {
  isSaving: boolean;
  lot: RegisteredCropLotRecord | null;
  onClose: () => void;
  onSave: (lotId: string, payload: UpdateCropLotPayload) => Promise<void>;
}) {
  const t = useTranslate();
  const [form, setForm] = useState(lot ? lotRecordToEditForm(lot) : lotRecordToEditForm({ crop: "", district: "", grade: "", id: "", pricePerKg: 0, quantityKg: 0, status: "" }));

  useEffect(() => {
    if (lot) {
      setForm(lotRecordToEditForm(lot));
    }
  }, [lot]);

  if (!lot) {
    return null;
  }

  const availableUpazillas = getUpazillasForDistrict(form.district);
  const updateField = (field: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [field]: value, ...(field === "district" ? { upazilla: "" } : {}) }));
  };

  const submitEdit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await onSave(lot.id, buildLotUpdatePayload(form));
  };

  return (
    <div className="admin-modal-backdrop" role="presentation">
      <section className="admin-modal lot-edit-modal" role="dialog" aria-modal="true" aria-labelledby="admin-edit-lot-title">
        <div className="admin-modal-header">
          <div>
            <span>{t("Edit lot")}</span>
            <h2 id="admin-edit-lot-title">{t(lot.crop)}</h2>
          </div>
          <button className="icon-button" type="button" aria-label={t("Close modal")} onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <form onSubmit={submitEdit}>
          <FormGrid>
            <label className="input-field">
              <span>{t("Crop name")}</span>
              <input value={form.crop} onChange={(event) => updateField("crop", event.target.value)} />
            </label>
            <label className="input-field">
              <span>{t("District")}</span>
              <select value={form.district} onChange={(event) => updateField("district", event.target.value)}>
                <option value="" disabled>
                  {t("Select service district")}
                </option>
                {serviceDistricts.map((district) => (
                  <option key={district} value={district}>
                    {t(district)}
                  </option>
                ))}
              </select>
            </label>
            <label className="input-field">
              <span>{t("Upazilla")}</span>
              <select value={form.upazilla} onChange={(event) => updateField("upazilla", event.target.value)} disabled={!form.district}>
                <option value="" disabled>
                  {t(form.district ? "Select upazilla" : "Select district first")}
                </option>
                {availableUpazillas.map((upazilla) => (
                  <option key={upazilla} value={upazilla}>
                    {t(upazilla)}
                  </option>
                ))}
              </select>
            </label>
            <label className="input-field">
              <span>{t("Quantity (kg)")}</span>
              <input value={form.quantityKg} min="1" onChange={(event) => updateField("quantityKg", event.target.value)} type="number" />
            </label>
            <label className="input-field">
              <span>{t("Price per kg")}</span>
              <input value={form.pricePerKg} min="1" onChange={(event) => updateField("pricePerKg", event.target.value)} type="number" />
            </label>
            <label className="input-field">
              <span>{t("Harvest date")}</span>
              <input value={form.harvestDate} onChange={(event) => updateField("harvestDate", event.target.value)} type="date" />
            </label>
            <label className="input-field">
              <span>{t("Grade")}</span>
              <select value={form.grade} onChange={(event) => updateField("grade", event.target.value)}>
                <option value="" disabled>
                  {t("Select grade")}
                </option>
                {["A", "B", "C"].map((grade) => (
                  <option key={grade} value={grade}>
                    {t(grade)}
                  </option>
                ))}
              </select>
            </label>
          </FormGrid>
          <label className="full-field">
            <span>{t("Notes")}</span>
            <textarea value={form.notes} onChange={(event) => updateField("notes", event.target.value)} />
          </label>
          <div className="modal-action-row">
            <button className="secondary-button" type="button" onClick={onClose} disabled={isSaving}>
              {t("Cancel")}
            </button>
            <button className="primary-button" type="submit" disabled={isSaving}>
              <Save size={18} />
              {t(isSaving ? "Saving" : "Save lot")}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

export function FarmerLotDetailsModal({
  account,
  onClose,
  onNotify,
  onReviewLot,
  onUpdateLot,
  onUpdateLotStatus,
}: {
  account: RegisteredAccount | null;
  onClose: () => void;
  onNotify?: (toast: AdminToast) => void;
  onReviewLot?: (lotId: string, action: "approve" | "reject") => Promise<void>;
  onUpdateLot?: (lotId: string, payload: UpdateCropLotPayload) => Promise<RegisteredCropLotRecord>;
  onUpdateLotStatus?: (lotId: string, status: CropLotStatusUpdate) => Promise<RegisteredCropLotRecord>;
}) {
  const t = useTranslate();
  const v = useValueText();
  const [editingLot, setEditingLot] = useState<RegisteredCropLotRecord | null>(null);
  const [reviewingLotId, setReviewingLotId] = useState<string | null>(null);
  const [savingLotId, setSavingLotId] = useState<string | null>(null);
  const [statusLotId, setStatusLotId] = useState<string | null>(null);

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
              <LotDetailCard
                key={lot.id}
                fallbackUpazilla={account.upazilla}
                isReviewing={reviewingLotId === lot.id}
                isStatusUpdating={statusLotId === lot.id}
                lot={lot}
                onEditLot={setEditingLot}
                onNotify={onNotify}
                onReviewLot={
                  onReviewLot
                    ? async (lotId, action) => {
                        setReviewingLotId(lotId);
                        try {
                          await onReviewLot(lotId, action);
                        } finally {
                          setReviewingLotId(null);
                        }
                      }
                    : undefined
                }
                onUpdateLotStatus={
                  onUpdateLotStatus
                    ? async (lotId, status) => {
                        setStatusLotId(lotId);
                        try {
                          await onUpdateLotStatus(lotId, status);
                        } finally {
                          setStatusLotId(null);
                        }
                      }
                    : undefined
                }
              />
            ))}
          </div>
        )}
      </section>
      <LotEditModal
        isSaving={savingLotId === editingLot?.id}
        lot={editingLot}
        onClose={() => setEditingLot(null)}
        onSave={async (lotId, payload) => {
          if (!onUpdateLot) {
            return;
          }

          setSavingLotId(lotId);
          try {
            await onUpdateLot(lotId, payload);
            onNotify?.({ message: "Lot updated.", tone: "success" });
            setEditingLot(null);
          } catch (error) {
            onNotify?.({ message: error instanceof Error ? error.message : "Lot update failed.", tone: "error" });
          } finally {
            setSavingLotId(null);
          }
        }}
      />
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
