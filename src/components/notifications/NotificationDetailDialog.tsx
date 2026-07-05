import { Bell, X } from "lucide-react";
import { useTranslate } from "../../i18n";
import type { AppNotification } from "../../types";

function splitNotificationBody(body: string) {
  return body
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function parseNotificationLine(line: string) {
  const separatorIndex = line.indexOf(":");
  if (separatorIndex <= 0) {
    return null;
  }

  return {
    label: line.slice(0, separatorIndex).trim(),
    value: line.slice(separatorIndex + 1).trim(),
  };
}

function formatNotificationDate(value?: string | null) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

export function NotificationDetailDialog({
  notification,
  onClose,
}: {
  notification: AppNotification;
  onClose: () => void;
}) {
  const t = useTranslate();
  const lines = splitNotificationBody(notification.body);
  const createdAt = formatNotificationDate(notification.createdAt);

  return (
    <div className="admin-modal-backdrop notification-detail-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="admin-modal notification-detail-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="notification-detail-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="admin-modal-header">
          <div>
            <span>{t("Notification details")}</span>
            <h2 id="notification-detail-title">{t(notification.title)}</h2>
          </div>
          <button className="icon-button" type="button" aria-label={t("Close modal")} onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        <div className="notification-detail-body">
          <div className={`notification-detail-type ${notification.tone}`}>
            <Bell size={18} />
            <strong>{t(notification.meta)}</strong>
            {createdAt ? <span>{createdAt}</span> : null}
          </div>
          <div className="notification-detail-summary">
            {lines.length > 0 ? (
              lines.map((line, index) => {
                const parsed = parseNotificationLine(line);
                if (!parsed) {
                  return (
                    <p className="notification-detail-paragraph" key={`${line}-${index}`}>
                      {line}
                    </p>
                  );
                }

                return (
                  <div className="notification-detail-line" key={`${line}-${index}`}>
                    <strong>{t(parsed.label)}</strong>
                    <span>{parsed.value || "-"}</span>
                  </div>
                );
              })
            ) : (
              <p className="notification-detail-paragraph">{t("No details provided.")}</p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
