import type { AdminSection } from "../../../types";
import { PricePanel, SupplyPanel } from "./AdminPanels";

export function SupplyLotsSection({ onOpenSection }: { onOpenSection: (section: AdminSection) => void }) {
  return (
    <section className="dashboard-grid admin-focused-grid">
      <SupplyPanel onOpenSection={onOpenSection} showAllLots wide />
      <PricePanel wide />
    </section>
  );
}
