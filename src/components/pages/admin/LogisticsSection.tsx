import { LogisticsPanel, MessagesPanel } from "./AdminPanels";

export function LogisticsSection() {
  return (
    <section className="dashboard-grid admin-focused-grid">
      <LogisticsPanel wide />
      <MessagesPanel />
    </section>
  );
}
