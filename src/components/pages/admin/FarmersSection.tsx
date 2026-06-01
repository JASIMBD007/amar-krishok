import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import type { AdminAccountPayload } from "../../../api/auth";
import { useTranslate, useValueText } from "../../../i18n";
import type { AccountStatus, RegisteredAccount } from "../../../types";
import { AccountDirectoryTable, AccountModal, AdminSnackbar, DeleteConfirmModal, type AdminToast } from "./AccountManagementTools";

export function FarmersSection({
  onCreateAccount,
  onDeleteAccount,
  onUpdateAccount,
  onUpdateRegistration,
  registrations,
  verificationError,
}: {
  onCreateAccount: (payload: AdminAccountPayload) => Promise<void>;
  onDeleteAccount: (id: string) => Promise<void>;
  onUpdateAccount: (id: string, payload: Partial<AdminAccountPayload>) => Promise<void>;
  onUpdateRegistration: (id: string, status: AccountStatus) => void;
  registrations: RegisteredAccount[];
  verificationError?: string;
}) {
  const t = useTranslate();
  const v = useValueText();
  const [accountModalOpen, setAccountModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<RegisteredAccount | null>(null);
  const [editingFarmer, setEditingFarmer] = useState<RegisteredAccount | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [toast, setToast] = useState<AdminToast | null>(null);
  const farmers = registrations.filter((account) => account.role === "farmer");
  const pendingFarmers = farmers.filter((account) => account.status === "pending");
  const activeFarmers = farmers.filter((account) => account.status === "active");
  const rejectedFarmers = farmers.filter((account) => account.status === "rejected");

  useEffect(() => {
    if (!toast) {
      return;
    }

    const timer = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const openCreateModal = () => {
    setEditingFarmer(null);
    setAccountModalOpen(true);
  };

  const openEditModal = (farmer: RegisteredAccount) => {
    setEditingFarmer(farmer);
    setAccountModalOpen(true);
  };

  const closeAccountModal = () => {
    setAccountModalOpen(false);
    setEditingFarmer(null);
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
      <section className="panel verification-panel admin-wide-panel" aria-labelledby="farmers-heading">
        <div className="panel-header">
          <div>
            <span>{t("Farmer accounts")}</span>
            <h2 id="farmers-heading">{t("Verified farmer directory")}</h2>
          </div>
          <button className="primary-button" type="button" onClick={openCreateModal}>
            <Plus size={17} />
            {t("Create farmer")}
          </button>
        </div>
        <p className="panel-copy">{t("See seller and farmer registrations, verification status, farm details, and supply focus.")}</p>
        {verificationError && <p className="auth-error">{t(verificationError)}</p>}

        <div className="verification-stats">
          <span>
            <strong>{v(farmers.length)}</strong>
            {t("Total farmers")}
          </span>
          <span>
            <strong>{v(activeFarmers.length)}</strong>
            {t("Approved accounts")}
          </span>
          <span>
            <strong>{v(pendingFarmers.length)}</strong>
            {t("Pending verification")}
          </span>
          <span>
            <strong>{v(rejectedFarmers.length)}</strong>
            {t("Rejected accounts")}
          </span>
        </div>

        <AccountDirectoryTable
          accounts={farmers}
          emptyText="No farmer registrations yet"
          onDelete={setDeleteTarget}
          onEdit={openEditModal}
          onUpdateRegistration={onUpdateRegistration}
          role="farmer"
        />
      </section>
      <AccountModal
        editingAccount={editingFarmer}
        onClose={closeAccountModal}
        onCreateAccount={onCreateAccount}
        onNotify={setToast}
        onUpdateAccount={onUpdateAccount}
        open={accountModalOpen}
        role="farmer"
      />
      <DeleteConfirmModal account={deleteTarget} isDeleting={isDeleting} onClose={() => setDeleteTarget(null)} onConfirm={confirmDelete} />
      <AdminSnackbar toast={toast} onClose={() => setToast(null)} />
    </section>
  );
}
