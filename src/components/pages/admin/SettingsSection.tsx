import { MessagesPanel, SettingsPanel } from "./AdminPanels";

export function SettingsSection() {
  return (
    <section className="dashboard-grid admin-focused-grid">
      <SettingsPanel />
      <MessagesPanel />
    </section>
  );
}
