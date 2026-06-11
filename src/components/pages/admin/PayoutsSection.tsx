import type { AdminSection } from "../../../types";
import { MessagesPanel, PayoutPanel, PayoutSettingsPanel } from "./AdminPanels";

export function PayoutsSection({
  onOpenSection,
  searchTerm,
}: {
  onOpenSection: (section: AdminSection) => void;
  searchTerm?: string;
}) {
  return (
    <section className="dashboard-grid admin-focused-grid">
      <PayoutPanel onOpenSection={onOpenSection} wide />
      <PayoutSettingsPanel />
      <MessagesPanel searchTerm={searchTerm} />
    </section>
  );
}
