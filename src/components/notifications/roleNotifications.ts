import type { BackendCropLot, BackendNotification, BackendOrder } from "../../api/auth";
import type { AppNotification, AuthUser, ChatThread, NotificationTone, NotificationType, RegisteredAccount, Role } from "../../types";

const notificationTones: NotificationTone[] = ["info", "success", "urgent", "warning"];
const notificationTypes: NotificationType[] = ["account", "chat", "logistics", "order", "payout", "supply", "system"];
const adminSections = new Set(["dashboard", "orders", "buyers", "supply", "farmers", "logistics", "payouts", "chat", "settings"]);

function isNotificationTone(value: string): value is NotificationTone {
  return notificationTones.includes(value as NotificationTone);
}

function isNotificationType(value: string): value is NotificationType {
  return notificationTypes.includes(value as NotificationType);
}

function roleHome(role: Role) {
  if (role === "admin") {
    return "/admin";
  }

  return role === "buyer" ? "/buyer" : "/farmer";
}

function hrefForNotification(role: Role, section: string, type: NotificationType) {
  if (role !== "admin") {
    return roleHome(role);
  }

  if (adminSections.has(section)) {
    return `/admin?section=${section}`;
  }

  if (type === "chat") {
    return "/admin?section=chat";
  }

  if (type === "order") {
    return "/admin?section=orders";
  }

  if (type === "payout") {
    return "/admin?section=payouts";
  }

  if (type === "supply") {
    return "/admin?section=supply";
  }

  if (type === "account") {
    return "/admin?section=buyers";
  }

  return "/admin";
}

function statusText(status: string) {
  return status.toLowerCase().replaceAll("_", " ");
}

function orderCropLabel(order: BackendOrder) {
  return order.items.map((item) => item.crop.name).filter(Boolean).join(", ") || "Crop request";
}

function orderStatusMeta(status: string) {
  const normalizedStatus = status.toLowerCase();

  if (normalizedStatus.includes("pending")) {
    return "Pending order";
  }

  if (normalizedStatus.includes("quality")) {
    return "Quality check";
  }

  if (normalizedStatus.includes("transit")) {
    return "In transit";
  }

  if (normalizedStatus.includes("matching")) {
    return "Matching";
  }

  return status;
}

function getLatestParticipantMessage(thread: ChatThread) {
  return [...thread.messages].reverse().find((message) => message.senderRole !== "admin");
}

function getLatestAdminMessage(thread: ChatThread) {
  return [...thread.messages].reverse().find((message) => message.senderRole === "admin");
}

function isThreadForUser(thread: ChatThread, user: AuthUser) {
  return thread.participantRole === user.role && (thread.participantId === user.accountId || thread.participantPhone === user.phone);
}

export function toAppNotification(notification: BackendNotification, role: Role): AppNotification {
  const type = isNotificationType(notification.type) ? notification.type : "system";
  const section = notification.section || "settings";

  return {
    body: notification.body,
    createdAt: notification.createdAt,
    href: hrefForNotification(role, section, type),
    id: notification.id,
    meta: notification.meta,
    readAt: notification.readAt,
    title: notification.title,
    tone: isNotificationTone(notification.tone) ? notification.tone : "info",
    type,
  };
}

export function makeRoleNotifications({
  chatThreads,
  lots,
  notificationError,
  orders,
  registrations,
  user,
}: {
  chatThreads: ChatThread[];
  lots: BackendCropLot[];
  notificationError: string;
  orders: BackendOrder[];
  registrations: RegisteredAccount[];
  user: AuthUser | null;
}) {
  if (!user) {
    return [] satisfies AppNotification[];
  }

  const notifications: AppNotification[] = [];

  if (notificationError) {
    notifications.push({
      body: notificationError,
      href: roleHome(user.role),
      id: `system-notifications-${notificationError}`,
      meta: "Backend service",
      title: "Notification sync issue",
      tone: "urgent",
      type: "system",
    });
  }

  if (user.role === "admin") {
    [...chatThreads]
      .filter((thread) => thread.status === "waiting" || thread.messages[thread.messages.length - 1]?.senderRole !== "admin")
      .sort((first, second) => new Date(second.updatedAt).getTime() - new Date(first.updatedAt).getTime())
      .slice(0, 4)
      .forEach((thread) => {
        const latestMessage = getLatestParticipantMessage(thread);
        notifications.push({
          body: `${thread.participantName}: ${latestMessage?.text ?? thread.subject}`,
          href: "/admin?section=chat",
          id: `chat-${thread.id}-${latestMessage?.id ?? thread.updatedAt}`,
          meta: thread.participantRole === "buyer" ? "Buyer chat" : thread.participantRole === "farmer" ? "Farmer chat" : "Guest chat",
          title: "New chat message",
          tone: "urgent",
          type: "chat",
        });
      });

    registrations
      .filter((account) => account.status === "pending")
      .sort((first, second) => new Date(second.submittedAt).getTime() - new Date(first.submittedAt).getTime())
      .slice(0, 5)
      .forEach((account) => {
        notifications.push({
          body: `${account.name} · ${account.district || account.organization || account.phone}`,
          href: account.role === "buyer" ? "/admin?section=buyers" : "/admin?section=farmers",
          id: `account-${account.id}-${account.submittedAt}`,
          meta: "Pending verification",
          title: account.role === "buyer" ? "Buyer verification request" : "Farmer verification request",
          tone: "warning",
          type: "account",
        });
      });

    const activeOrders = orders.filter((order) => !["COMPLETED", "CANCELLED"].includes(order.status.toUpperCase()));
    activeOrders
      .sort((first, second) => new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime())
      .slice(0, 4)
      .forEach((order) => {
        notifications.push({
          body: `${order.buyer.name} · ${orderCropLabel(order)} · ${order.district.name}`,
          href: "/admin?section=orders",
          id: `admin-order-${order.id}-${order.updatedAt}`,
          meta: orderStatusMeta(order.status),
          title: "Order request needs review",
          tone: order.status.toLowerCase().includes("pending") ? "urgent" : "info",
          type: "order",
        });
      });

    if (activeOrders.some((order) => ["QUALITY_CHECK", "IN_TRANSIT"].includes(order.status.toUpperCase()))) {
      notifications.push({
        body: "Check delivery proof, buyer confirmation, and farmer payout release.",
        href: "/admin?section=payouts",
        id: `admin-payout-follow-up-${activeOrders.length}`,
        meta: "Active order follow-up",
        title: "QC or payout follow-up",
        tone: "success",
        type: "payout",
      });
    }

    return notifications.slice(0, 12);
  }

  chatThreads
    .filter((thread) => isThreadForUser(thread, user))
    .sort((first, second) => new Date(second.updatedAt).getTime() - new Date(first.updatedAt).getTime())
    .slice(0, 2)
    .forEach((thread) => {
      const latestAdminMessage = getLatestAdminMessage(thread);
      if (!latestAdminMessage) {
        return;
      }

      notifications.push({
        body: latestAdminMessage.text,
        href: roleHome(user.role),
        id: `admin-reply-${thread.id}-${latestAdminMessage.id}`,
        meta: "Support chat",
        title: "Admin replied to chat",
        tone: "urgent",
        type: "chat",
      });
    });

  if (user.role === "buyer") {
    const activeOrders = orders.filter((order) => !["COMPLETED", "CANCELLED"].includes(order.status.toUpperCase()));
    activeOrders.slice(0, 4).forEach((order) => {
      notifications.push({
        body: `${orderCropLabel(order)} · ${order.district.name} · ${statusText(order.status)}`,
        href: "/buyer",
        id: `buyer-order-${order.id}-${order.updatedAt}`,
        meta: "Order update",
        title: "Order status update",
        tone: order.status.toLowerCase().includes("pending") ? "warning" : "info",
        type: "order",
      });
    });

    if (activeOrders.length > 0) {
      notifications.push({
        body: "Payment stays protected until delivery and weight are confirmed.",
        href: "/buyer",
        id: `buyer-payment-${activeOrders.length}`,
        meta: "Payment protection",
        title: "Payment update",
        tone: "success",
        type: "payout",
      });
    }
  }

  if (user.role === "farmer") {
    lots.slice(0, 4).forEach((lot) => {
      notifications.push({
        body: `${lot.crop.name} · ${lot.district.name} · ${statusText(lot.status)}`,
        href: "/farmer",
        id: `farmer-lot-${lot.id}-${lot.updatedAt}`,
        meta: "Supply Lots",
        title: "Lot status update",
        tone: lot.status === "ACTIVE" ? "success" : "info",
        type: "supply",
      });
    });

    if (lots.length > 0) {
      notifications.push({
        body: "Payout will be released after buyer confirmation and quality check.",
        href: "/farmer",
        id: `farmer-payout-${lots.length}`,
        meta: "Payment protection",
        title: "Payment update",
        tone: "success",
        type: "payout",
      });
    }
  }

  return notifications.slice(0, 12);
}

export function mergeNotifications(backendNotifications: AppNotification[] | null, fallbackNotifications: AppNotification[]) {
  if (!backendNotifications) {
    return fallbackNotifications;
  }

  const seen = new Set<string>();
  return [...backendNotifications, ...fallbackNotifications]
    .filter((notification) => {
      const key = `${notification.title}-${notification.body}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    })
    .slice(0, 12);
}
