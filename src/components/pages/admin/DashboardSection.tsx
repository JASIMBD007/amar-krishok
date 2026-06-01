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
  registrations,
  verificationError,
}: {
  onOpenSection: (section: AdminSection) => void;
  onUpdateRegistration: (id: string, status: AccountStatus) => void;
  registrations: RegisteredAccount[];
  verificationError?: string;
}) {
  return (
    <>
      <StatsPanel />
      <section className="dashboard-grid">
        <OrdersPanel onOpenSection={onOpenSection} />
        <PayoutPanel onOpenSection={onOpenSection} />
        <VerificationPanel registrations={registrations} onUpdateRegistration={onUpdateRegistration} verificationError={verificationError} />
        <SupplyPanel onOpenSection={onOpenSection} />
        <PricePanel />
        <LogisticsPanel />
        <MessagesPanel />
      </section>
    </>
  );
}
