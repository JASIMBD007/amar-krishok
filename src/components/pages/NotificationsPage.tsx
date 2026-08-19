import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Inbox, SlidersHorizontal } from "lucide-react";
import { useTranslate, useValueText } from "../../i18n";
import { notificationIcons } from "../notifications/notificationIcons";
import type { AppNotification, NotificationType } from "../../types";

/**
 * The notification centre: `/notifications`.
 *
 * Four tabs over one list, each carrying its own unread count. Rows are the handoff's recipe — a
 * tinted icon square, the title with an unread dot, the body, and a right column with the relative
 * time and the read toggle.
 */

type NotificationTab = "orders" | "payouts" | "rates" | "system";

/**
 * Which tab a notification belongs to. The app has more types than the centre has tabs, so several
 * fold into System rather than growing a tab per type.
 */
const TAB_FOR_TYPE: Record<NotificationType, NotificationTab> = {
  account: "system",
  chat: "system",
  logistics: "orders",
  order: "orders",
  payout: "payouts",
  rate: "rates",
  supply: "orders",
  system: "system",
};

const TABS: Array<{ label: string; tab: NotificationTab }> = [
  { label: "Orders", tab: "orders" },
  { label: "Payouts", tab: "payouts" },
  { label: "Rates", tab: "rates" },
  { label: "System", tab: "system" },
];

/** Tone drives the icon square's colour, so what a row is about is readable before it is read. */
const TONE_CLASS: Record<AppNotification["tone"], string> = {
  info: "blue",
  success: "green",
  urgent: "red",
  warning: "amber",
};

/** "12 min ago" / "Yesterday", from the timestamp rather than a stored label. */
function relativeTime(value: string | undefined, t: (text: string) => string) {
  if (!value) {
    return "";
  }

  const then = new Date(value).getTime();
  if (Number.isNaN(then)) {
    return "";
  }

  const minutes = Math.round((Date.now() - then) / 60_000);
  if (minutes < 1) {
    return t("Just now");
  }

  if (minutes < 60) {
    return `${minutes} ${t(minutes === 1 ? "minute ago" : "min ago")}`;
  }

  const hours = Math.round(minutes / 60);
  if (hours < 24) {
    return `${hours} ${t(hours === 1 ? "hour ago" : "h ago")}`;
  }

  if (Math.round(hours / 24) === 1) {
    return t("Yesterday");
  }

  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", timeZone: "Asia/Dhaka" }).format(then);
}

export function NotificationsPage({
  notifications,
  onMarkAllRead,
  onOpenNotification,
  onToggleRead,
  reviewedIds,
}: {
  notifications: AppNotification[];
  onMarkAllRead: () => void;
  onOpenNotification: (notification: AppNotification) => void;
  /** Flips one row's read state. Read state is the server's, so this goes through the API. */
  onToggleRead: (notification: AppNotification, read: boolean) => void;
  reviewedIds: string[];
}) {
  const navigate = useNavigate();
  const t = useTranslate();
  const v = useValueText();
  const [tab, setTab] = useState<NotificationTab | null>(null);

  const isUnread = useCallback(
    // Unread means unread on the server and not yet skimmed in this browser.
    (notification: AppNotification) => !notification.readAt && !reviewedIds.includes(notification.id),
    [reviewedIds],
  );

  const unreadByTab = useMemo(() => {
    const counts: Record<NotificationTab, number> = { orders: 0, payouts: 0, rates: 0, system: 0 };
    for (const notification of notifications) {
      if (isUnread(notification)) {
        counts[TAB_FOR_TYPE[notification.type] ?? "system"] += 1;
      }
    }
    return counts;
  }, [isUnread, notifications]);

  const unreadTotal = notifications.filter(isUnread).length;

  /**
   * Opening the centre from a badge and landing on an empty tab reads as a broken badge, so the first
   * tab carrying something unread is chosen — once, when the notifications first arrive. Deriving it
   * on every render instead moved the tab out from under the row you had just marked read.
   */
  useEffect(() => {
    if (tab !== null || notifications.length === 0) {
      return;
    }

    setTab(TABS.find((entry) => unreadByTab[entry.tab] > 0)?.tab ?? "orders");
  }, [notifications.length, tab, unreadByTab]);

  const activeTab = tab ?? "orders";
  const visible = notifications.filter((notification) => (TAB_FOR_TYPE[notification.type] ?? "system") === activeTab);

  return (
    <section className="page-wrap notifications-page">
      <div className="notifications-head">
        <div>
          <h1>{t("Notifications")}</h1>
          <span>
            {v(unreadTotal)} {t("unread")} · {t("SMS copies follow your preferences")}
          </span>
        </div>
        <div className="notifications-head-actions">
          <button className="secondary-button" disabled={unreadTotal === 0} type="button" onClick={onMarkAllRead}>
            {t("Mark all read")}
          </button>
          <button className="secondary-button" type="button" onClick={() => navigate("/profile")}>
            <SlidersHorizontal aria-hidden="true" size={15} />
            {t("Preferences")}
          </button>
        </div>
      </div>

      <div className="notification-tabs" role="tablist">
        {TABS.map((entry) => (
          <button
            aria-selected={activeTab === entry.tab}
            className={activeTab === entry.tab ? "on" : ""}
            key={entry.tab}
            role="tab"
            type="button"
            onClick={() => setTab(entry.tab)}
          >
            {t(entry.label)}
            {unreadByTab[entry.tab] > 0 ? <em className="mono-figure">{v(unreadByTab[entry.tab])}</em> : null}
          </button>
        ))}
      </div>

      <div className="notification-rows">
        {visible.length === 0 ? (
          <div className="notification-rows-empty">
            <Inbox aria-hidden="true" size={28} />
            <strong>{t("Nothing here yet")}</strong>
            <span>{t("Anything that needs you shows up on this tab.")}</span>
          </div>
        ) : null}

        {visible.map((notification) => {
          const unread = isUnread(notification);
          return (
            <article className="notification-row" key={notification.id}>
              <span className={`notification-row-icon ${TONE_CLASS[notification.tone]}`} aria-hidden="true">
                {(() => {
                  const Icon = notificationIcons[notification.type];
                  return <Icon size={18} />;
                })()}
              </span>
              <button className="notification-row-copy" type="button" onClick={() => onOpenNotification(notification)}>
                <span className="notification-row-title">
                  <strong>{t(notification.title)}</strong>
                  {unread ? <i className="notification-row-dot" aria-label={t("Unread notification")} /> : null}
                </span>
                <span className="notification-row-body">{t(notification.body)}</span>
              </button>
              <span className="notification-row-side">
                <small>{v(relativeTime(notification.createdAt, t))}</small>
                <button className="text-link" type="button" onClick={() => onToggleRead(notification, unread)}>
                  {t(unread ? "Mark read" : "Mark unread")}
                </button>
              </span>
            </article>
          );
        })}
      </div>
    </section>
  );
}
