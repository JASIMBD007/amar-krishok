import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

/** A friendly empty-state block: icon chip, title, optional hint and action. */
export function EmptyState({
  icon: Icon,
  title,
  hint,
  action,
}: {
  icon: LucideIcon;
  title: string;
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <span className="empty-state-icon">
        <Icon size={24} />
      </span>
      <strong>{title}</strong>
      {hint ? <p>{hint}</p> : null}
      {action ? <div className="empty-state-action">{action}</div> : null}
    </div>
  );
}

/** A lightweight loading row for lists, consistent across dashboards. */
export function ListLoading({ label }: { label: string }) {
  return (
    <div className="list-loading">
      <span className="list-loading-spinner" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}
