import { Bell, CheckCircle2, MessageSquareText, ServerCrash, ShoppingBag, Sprout, Truck, UserRoundCheck, WalletCards } from "lucide-react";
import { useTranslate, useValueText } from "../../../i18n";
import type { AdminSection } from "../../../types";

export type AdminNotificationTone = "info" | "success" | "urgent" | "warning";

export type AdminNotificationType = "account" | "chat" | "logistics" | "order" | "payout" | "supply" | "system";

export type AdminNotification = {
  body: string;
  createdAt?: string;
  id: string;
  meta: string;
  readAt?: string | null;
  section: AdminSection;
  title: string;
  tone: AdminNotificationTone;
  type: AdminNotificationType;
};

const notificationIcons = {
  account: UserRoundCheck,
  chat: MessageSquareText,
  logistics: Truck,
  order: ShoppingBag,
  payout: WalletCards,
  supply: Sprout,
  system: ServerCrash,
};

export function AdminNotifications({
  notifications,
  onMarkAllReviewed,
  onOpenNotification,
  onToggle,
  open,
  reviewedIds,
}: {
  notifications: AdminNotification[];
  onMarkAllReviewed: () => void;
  onOpenNotification: (notification: AdminNotification) => void;
  onToggle: () => void;
  open: boolean;
  reviewedIds: string[];
}) {
  const t = useTranslate();
  const v = useValueText();
  const unreadCount = notifications.filter((notification) => !notification.readAt && !reviewedIds.includes(notification.id)).length;

  return (
    <div className="notification-shell">
      <button className="icon-button notification-button" type="button" aria-label={t("Notifications")} aria-expanded={open} onClick={onToggle}>
        <Bell size={19} />
        {unreadCount > 0 && <span className="notification-badge">{v(unreadCount)}</span>}
      </button>

      {open && (
        <section className="notification-panel" aria-label={t("Admin notifications")}>
          <div className="notification-panel-header">
            <div>
              <span>{t("Admin notifications")}</span>
              <strong>{unreadCount > 0 ? t("Needs attention") : t("All caught up")}</strong>
            </div>
            <button className="secondary-button compact-action" type="button" onClick={onMarkAllReviewed} disabled={notifications.length === 0}>
              <CheckCircle2 size={15} />
              {t("Mark all reviewed")}
            </button>
          </div>

          <div className="notification-list">
            {notifications.length === 0 && <em>{t("No admin notifications right now")}</em>}
            {notifications.map((notification) => {
              const Icon = notificationIcons[notification.type];
              const isReviewed = Boolean(notification.readAt) || reviewedIds.includes(notification.id);

              return (
                <button className={`notification-item ${notification.tone} ${isReviewed ? "reviewed" : ""}`} key={notification.id} type="button" onClick={() => onOpenNotification(notification)}>
                  <span className="notification-item-icon">
                    <Icon size={17} />
                  </span>
                  <span className="notification-item-copy">
                    <strong>{t(notification.title)}</strong>
                    <small>{notification.body}</small>
                    <em>{t(notification.meta)}</em>
                  </span>
                  {!isReviewed && <span className="notification-dot" aria-label={t("Unread notification")} />}
                </button>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
