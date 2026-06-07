import type { AdminSection, RegisteredAccount } from "../../../types";
import { PricePanel, SupplyPanel } from "./AdminPanels";

export function SupplyLotsSection({
  onOpenSection,
  registrations,
}: {
  onOpenSection: (section: AdminSection) => void;
  registrations: RegisteredAccount[];
}) {
  return (
    <section className="dashboard-grid admin-focused-grid">
      <SupplyPanel onOpenSection={onOpenSection} registrations={registrations} showAllLots wide />
      <PricePanel wide />
    </section>
  );
}
