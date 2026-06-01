import type { BackendOrder } from "../../../api/auth";
import type { AdminSection } from "../../../types";
import { MessagesPanel, OrdersPanel } from "./AdminPanels";

export function OrdersSection({
  backendOrders,
  onOpenSection,
  orderError,
}: {
  backendOrders?: BackendOrder[] | null;
  onOpenSection: (section: AdminSection) => void;
  orderError?: string;
}) {
  return (
    <section className="dashboard-grid admin-focused-grid">
      <OrdersPanel backendOrders={backendOrders} onOpenSection={onOpenSection} orderError={orderError} wide />
      <MessagesPanel />
    </section>
  );
}
