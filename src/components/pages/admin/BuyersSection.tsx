import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import type { AdminAccountPayload } from "../../../api/auth";
import { useTranslate, useValueText } from "../../../i18n";
import type { AccountStatus, RegisteredAccount } from "../../../types";
import { AccountDirectoryTable, AccountModal, AdminSnackbar, DeleteConfirmModal, type AdminToast } from "./AccountManagementTools";
import { accountMatchesSearch } from "./searchHelpers";

export function BuyersSection({
  onCreateAccount,
  onDeleteAccount,
  onUpdateAccount,
  onUpdateRegistration,
  registrations,
  searchTerm,
  verificationError,
}: {
  onCreateAccount: (payload: AdminAccountPayload) => Promise<void>;
  onDeleteAccount: (id: string) => Promise<void>;
  onUpdateAccount: (id: string, payload: Partial<AdminAccountPayload>) => Promise<void>;
  onUpdateRegistration: (id: string, status: AccountStatus) => void;
  registrations: RegisteredAccount[];
  searchTerm?: string;
  verificationError?: string;
}) {
  const t = useTranslate();
  const v = useValueText();
  const [accountModalOpen, setAccountModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<RegisteredAccount | null>(null);
  const [editingBuyer, setEditingBuyer] = useState<RegisteredAccount | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [toast, setToast] = useState<AdminToast | null>(null);
  const buyers = registrations.filter((account) => account.role === "buyer" && accountMatchesSearch(searchTerm ?? "", account, t));
  const pendingBuyers = buyers.filter((account) => account.status === "pending");
  const activeBuyers = buyers.filter((account) => account.status === "active");
  const rejectedBuyers = buyers.filter((account) => account.status === "rejected");

  useEffect(() => {
    if (!toast) {
      return;
    }

    const timer = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const openCreateModal = () => {
    setEditingBuyer(null);
    setAccountModalOpen(true);
  };

  const openEditModal = (buyer: RegisteredAccount) => {
    setEditingBuyer(buyer);
    setAccountModalOpen(true);
  };

  const closeAccountModal = () => {
    setAccountModalOpen(false);
    setEditingBuyer(null);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) {
      return;
    }

    setIsDeleting(true);
    try {
      await onDeleteAccount(deleteTarget.id);
      setToast({ message: "Account deleted.", tone: "success" });
      setDeleteTarget(null);
    } catch (apiError) {
      setToast({ message: apiError instanceof Error ? apiError.message : "Account action failed.", tone: "error" });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <section className="dashboard-grid admin-focused-grid">
      <section className="panel verification-panel admin-wide-panel" aria-labelledby="buyers-heading">
        <div className="panel-header">
          <div>
            <span>{t("Buyer accounts")}</span>
            <h2 id="buyers-heading">{t("Registered buyers")}</h2>
          </div>
          <button className="primary-button" type="button" onClick={openCreateModal}>
            <Plus size={17} />
            {t("Create buyer")}
          </button>
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

        <AccountDirectoryTable
          accounts={buyers}
          emptyText="No buyer registrations yet"
          onDelete={setDeleteTarget}
          onEdit={openEditModal}
          onUpdateRegistration={onUpdateRegistration}
          role="buyer"
        />
      </section>
      <AccountModal
        editingAccount={editingBuyer}
        onClose={closeAccountModal}
        onCreateAccount={onCreateAccount}
        onNotify={setToast}
        onUpdateAccount={onUpdateAccount}
        open={accountModalOpen}
        role="buyer"
      />
      <DeleteConfirmModal account={deleteTarget} isDeleting={isDeleting} onClose={() => setDeleteTarget(null)} onConfirm={confirmDelete} />
      <AdminSnackbar toast={toast} onClose={() => setToast(null)} />
    </section>
  );
}
