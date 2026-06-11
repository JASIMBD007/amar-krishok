import type { BackendOrder } from "../../../api/auth";
import type { AccountStatus, AdminSection, RegisteredAccount } from "../../../types";
import {
  LogisticsPanel,
  MessagesPanel,
  OrdersPanel,
  PayoutPanel,
  PricePanel,
  StatsPanel,
  SupplyPanel,
  VerificationPanel,
} from "./AdminPanels";

export function DashboardSection({
  onOpenSection,
  onUpdateRegistration,
  backendOrders,
  orderError,
  registrations,
  searchTerm,
  verificationError,
}: {
  backendOrders?: BackendOrder[] | null;
  onOpenSection: (section: AdminSection) => void;
  onUpdateRegistration: (id: string, status: AccountStatus) => void;
  orderError?: string;
  registrations: RegisteredAccount[];
  searchTerm?: string;
  verificationError?: string;
}) {
  return (
    <>
      <StatsPanel />
      <section className="dashboard-grid">
        <OrdersPanel backendOrders={backendOrders} onOpenSection={onOpenSection} orderError={orderError} searchTerm={searchTerm} />
        <PayoutPanel onOpenSection={onOpenSection} />
        <VerificationPanel
          registrations={registrations}
          onUpdateRegistration={onUpdateRegistration}
          searchTerm={searchTerm}
          verificationError={verificationError}
        />
        <SupplyPanel onOpenSection={onOpenSection} registrations={registrations} searchTerm={searchTerm} />
        <PricePanel searchTerm={searchTerm} />
        <LogisticsPanel searchTerm={searchTerm} />
        <MessagesPanel searchTerm={searchTerm} />
      </section>
    </>
  );
}
