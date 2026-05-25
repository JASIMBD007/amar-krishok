import type { AdminSection } from "../../../types";
import { PayoutPanel, PayoutSettingsPanel } from "./AdminPanels";

export function PayoutsSection({ onOpenSection }: { onOpenSection: (section: AdminSection) => void }) {
  return (
    <section className="dashboard-grid admin-focused-grid">
      <PayoutPanel onOpenSection={onOpenSection} wide />
      <PayoutSettingsPanel />
    </section>
  );
}
