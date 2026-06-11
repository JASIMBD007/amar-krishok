import { LogisticsPanel, MessagesPanel } from "./AdminPanels";

export function LogisticsSection({ searchTerm }: { searchTerm?: string }) {
  return (
    <section className="dashboard-grid admin-focused-grid">
      <LogisticsPanel searchTerm={searchTerm} wide />
      <MessagesPanel searchTerm={searchTerm} />
    </section>
  );
}
