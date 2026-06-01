import type { AccountStatus, RegisteredAccount } from "../../../types";
import { FarmerDirectoryPanel, VerificationPanel } from "./AdminPanels";

export function FarmersSection({
  onUpdateRegistration,
  registrations,
  verificationError,
}: {
  onUpdateRegistration: (id: string, status: AccountStatus) => void;
  registrations: RegisteredAccount[];
  verificationError?: string;
}) {
  return (
    <section className="dashboard-grid admin-focused-grid">
      <VerificationPanel registrations={registrations} onUpdateRegistration={onUpdateRegistration} verificationError={verificationError} wide />
      <FarmerDirectoryPanel />
    </section>
  );
}
