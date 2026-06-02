import { Bell, CheckCircle2, MessageSquareText, ServerCrash, ShoppingBag, Sprout, Truck, UserRoundCheck, WalletCards, type LucideIcon } from "lucide-react";
import { useTranslate, useValueText } from "../../i18n";
import type { AppNotification, NotificationType } from "../../types";

const notificationIcons: Record<NotificationType, LucideIcon> = {
  account: UserRoundCheck,
  chat: MessageSquareText,
  logistics: Truck,
  order: ShoppingBag,
  payout: WalletCards,
  supply: Sprout,
  system: ServerCrash,
};

export function NotificationCenter({
  emptyLabel = "No notifications right now",
  notifications,
  onMarkAllReviewed,
  onOpenNotification,
  onToggle,
  open,
  panelLabel = "Notifications",
  reviewedIds,
}: {
  emptyLabel?: string;
  notifications: AppNotification[];
  onMarkAllReviewed: () => void;
  onOpenNotification: (notification: AppNotification) => void;
  onToggle: () => void;
  open: boolean;
  panelLabel?: string;
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
        <section className="notification-panel" aria-label={t(panelLabel)}>
          <div className="notification-panel-header">
            <div>
              <span>{t(panelLabel)}</span>
              <strong>{unreadCount > 0 ? t("Needs attention") : t("All caught up")}</strong>
            </div>
            <button className="secondary-button compact-action" type="button" onClick={onMarkAllReviewed} disabled={notifications.length === 0}>
              <CheckCircle2 size={15} />
              {t("Mark all reviewed")}
            </button>
          </div>

          <div className="notification-list">
            {notifications.length === 0 && <em>{t(emptyLabel)}</em>}
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
