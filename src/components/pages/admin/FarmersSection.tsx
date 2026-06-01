import { useState } from "react";
import type { AdminAccountPayload } from "../../../api/auth";
import type { AccountStatus, RegisteredAccount } from "../../../types";
import { AccountManagementForm } from "./AccountManagementForm";
import { FarmerDirectoryPanel, VerificationPanel } from "./AdminPanels";

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
  const [editingFarmer, setEditingFarmer] = useState<RegisteredAccount | null>(null);

  return (
    <section className="dashboard-grid admin-focused-grid">
      <section className="panel verification-panel admin-wide-panel">
        <AccountManagementForm
          editingAccount={editingFarmer}
          onCancelEdit={() => setEditingFarmer(null)}
          onCreateAccount={onCreateAccount}
          onDeleteAccount={onDeleteAccount}
          onUpdateAccount={onUpdateAccount}
          role="farmer"
        />
      </section>
      <VerificationPanel registrations={registrations} onUpdateRegistration={onUpdateRegistration} verificationError={verificationError} wide />
      <FarmerDirectoryPanel registrations={registrations} onEditAccount={setEditingFarmer} />
    </section>
  );
}
