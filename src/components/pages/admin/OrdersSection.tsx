import type { AdminSection } from "../../../types";
import { MessagesPanel, OrdersPanel } from "./AdminPanels";

export function OrdersSection({ onOpenSection }: { onOpenSection: (section: AdminSection) => void }) {
  return (
    <section className="dashboard-grid admin-focused-grid">
      <OrdersPanel onOpenSection={onOpenSection} wide />
      <MessagesPanel />
    </section>
  );
}
