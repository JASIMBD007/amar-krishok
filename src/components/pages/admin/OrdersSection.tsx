import type { BackendOrder } from "../../../api/auth";
import type { AdminSection } from "../../../types";
import { MessagesPanel, OrdersPanel } from "./AdminPanels";

export function OrdersSection({
  backendOrders,
  onOpenSection,
  orderError,
  searchTerm,
}: {
  backendOrders?: BackendOrder[] | null;
  onOpenSection: (section: AdminSection) => void;
  orderError?: string;
  searchTerm?: string;
}) {
  return (
    <section className="dashboard-grid admin-focused-grid">
      <OrdersPanel backendOrders={backendOrders} onOpenSection={onOpenSection} orderError={orderError} searchTerm={searchTerm} wide />
      <MessagesPanel searchTerm={searchTerm} />
    </section>
  );
}
