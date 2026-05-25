import type { AccountStatus, RegisteredAccount } from "../../../types";
import { FarmerDirectoryPanel, VerificationPanel } from "./AdminPanels";

export function FarmersSection({
  onUpdateRegistration,
  registrations,
}: {
  onUpdateRegistration: (id: string, status: AccountStatus) => void;
  registrations: RegisteredAccount[];
}) {
  return (
    <section className="dashboard-grid admin-focused-grid">
      <VerificationPanel registrations={registrations} onUpdateRegistration={onUpdateRegistration} wide />
      <FarmerDirectoryPanel />
    </section>
  );
}
