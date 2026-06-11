import type { AdminSection, RegisteredAccount } from "../../../types";
import { PricePanel, SupplyPanel } from "./AdminPanels";

export function SupplyLotsSection({
  onOpenSection,
  registrations,
  searchTerm,
}: {
  onOpenSection: (section: AdminSection) => void;
  registrations: RegisteredAccount[];
  searchTerm?: string;
}) {
  return (
    <section className="dashboard-grid admin-focused-grid">
      <SupplyPanel onOpenSection={onOpenSection} registrations={registrations} searchTerm={searchTerm} showAllLots wide />
      <PricePanel searchTerm={searchTerm} wide />
    </section>
  );
}
