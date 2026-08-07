import { Injectable, NotFoundException } from "@nestjs/common";
import { AccountStatus, LegacyNotification as Notification, Role } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

type NotificationInput = {
  body: string;
  title: string;
};

function notificationMeta(title: string) {
  switch (title) {
    case "New chat message":
      return { meta: "Admin chat inbox", section: "chat", tone: "urgent", type: "chat" };
    case "Buyer verification request":
      return { meta: "Pending verification", section: "buyers", tone: "warning", type: "account" };
    case "Farmer verification request":
      return { meta: "Pending verification", section: "farmers", tone: "warning", type: "account" };
    case "Order request needs review":
      return { meta: "Pending order", section: "orders", tone: "urgent", type: "order" };
    case "New supply lot posted":
      return { meta: "Supply approval", section: "supply", tone: "warning", type: "supply" };
    case "Registration received":
      return { meta: "Account verification", section: "profile", tone: "info", type: "account" };
    case "Account verified":
      return { meta: "Account approved", section: "profile", tone: "success", type: "account" };
    case "Account review update":
      return { meta: "Account verification", section: "profile", tone: "warning", type: "account" };
    case "Password reset request":
      return { meta: "Password reset", section: "settings", tone: "urgent", type: "account" };
    case "Password reset requested":
      return { meta: "Account security", section: "profile", tone: "warning", type: "account" };
    case "Password reset approved":
      return { meta: "Account security", section: "profile", tone: "success", type: "account" };
    case "Password reset rejected":
      return { meta: "Account security", section: "profile", tone: "warning", type: "account" };
    case "Order request received":
      return { meta: "Order update", section: "orders", tone: "success", type: "order" };
    case "Order status update":
      return { meta: "Order update", section: "orders", tone: "info", type: "order" };
    case "New order for your lot":
      return { meta: "Buyer demand", section: "orders", tone: "urgent", type: "order" };
    case "Crop lot published":
      return { meta: "Supply Lots", section: "supply", tone: "success", type: "supply" };
    case "Crop lot submitted":
      return { meta: "Supply approval", section: "supply", tone: "warning", type: "supply" };
    case "Lot status update":
      return { meta: "Supply Lots", section: "supply", tone: "info", type: "supply" };
    case "Farmer lot updated":
      return { meta: "Supply update", section: "supply", tone: "info", type: "supply" };
    case "Farmer lot status changed":
      return { meta: "Supply status", section: "supply", tone: "info", type: "supply" };
    case "Payment update":
      return { meta: "Payment protection", section: "payouts", tone: "success", type: "payout" };
    case "Admin replied to chat":
      return { meta: "Support chat", section: "chat", tone: "urgent", type: "chat" };
    default:
      return { meta: "Backend service", section: "settings", tone: "info", type: "system" };
  }
}

function toNotification(notification: Notification) {
  return {
    ...notificationMeta(notification.title),
    body: notification.body,
    createdAt: notification.createdAt,
    id: notification.id,
    readAt: notification.readAt,
    title: notification.title,
  };
}

function notificationAccountRole(title: string) {
  if (title === "Buyer verification request") {
    return Role.BUYER;
  }

  if (title === "Farmer verification request") {
    return Role.FARMER;
  }

  return null;
}

function notificationSubject(body: string) {
  return body.split(/[·:]/)[0]?.trim() ?? "";
}

function normalizedSubject(value: string) {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async notifyAdmins(input: NotificationInput) {
    const admins = await this.prisma.legacyUser.findMany({
      select: { id: true },
      where: { role: Role.ADMIN },
    });

    return this.notifyUsers(admins.map((admin) => admin.id), input);
  }

  async notifyUser(userId: string | null | undefined, input: NotificationInput) {
    if (!userId) {
      return null;
    }

    return this.prisma.legacyNotification.create({
      data: {
        body: input.body,
        title: input.title,
        userId,
      },
    });
  }

  async notifyUsers(userIds: string[], input: NotificationInput) {
    const uniqueUserIds = Array.from(new Set(userIds.filter(Boolean)));
    if (uniqueUserIds.length === 0) {
      return { count: 0 };
    }

    return this.prisma.legacyNotification.createMany({
      data: uniqueUserIds.map((userId) => ({
        body: input.body,
        title: input.title,
        userId,
      })),
      skipDuplicates: false,
    });
  }

  async listForUser(userId: string) {
    const notifications = await this.prisma.legacyNotification.findMany({
      orderBy: { createdAt: "desc" },
      take: 40,
      where: { userId },
    });

    const resolvedNotifications = await this.resolveReviewedNotifications(notifications);
    return resolvedNotifications.map(toNotification);
  }

  async markRead(userId: string, id: string) {
    const result = await this.prisma.legacyNotification.updateMany({
      data: { readAt: new Date() },
      where: { id, userId },
    });

    if (result.count === 0) {
      throw new NotFoundException("Notification not found.");
    }

    const notification = await this.prisma.legacyNotification.findUniqueOrThrow({ where: { id } });
    return toNotification(notification);
  }

  async markAllRead(userId: string) {
    return this.prisma.legacyNotification.updateMany({
      data: { readAt: new Date() },
      where: { readAt: null, userId },
    });
  }

  async markVerificationRequestNotificationsReviewed(account: { name: string; role: Role }) {
    if (account.role !== Role.BUYER && account.role !== Role.FARMER) {
      return { count: 0 };
    }

    return this.prisma.legacyNotification.updateMany({
      data: { readAt: new Date() },
      where: {
        body: { contains: account.name },
        readAt: null,
        title: account.role === Role.BUYER ? "Buyer verification request" : "Farmer verification request",
        user: { role: Role.ADMIN },
      },
    });
  }

  async markPasswordResetRequestNotificationsReviewed(request: { id?: string; phone: string; user?: { name?: string } | null }) {
    const filters = [request.id, request.phone, request.user?.name].filter((value): value is string => Boolean(value));
    if (filters.length === 0) {
      return { count: 0 };
    }

    return this.prisma.legacyNotification.updateMany({
      data: { readAt: new Date() },
      where: {
        OR: filters.map((value) => ({ body: { contains: value } })),
        readAt: null,
        title: "Password reset request",
        user: { role: Role.ADMIN },
      },
    });
  }

  async markSupplyLotNotificationsReviewed(lot: { crop: { name: string }; district: { name: string }; farmer: { name: string }; upazilla?: string | null }) {
    const filters = [lot.farmer.name, lot.crop.name, lot.upazilla, lot.district.name].filter((value): value is string => Boolean(value));
    if (filters.length === 0) {
      return { count: 0 };
    }

    return this.prisma.legacyNotification.updateMany({
      data: { readAt: new Date() },
      where: {
        AND: filters.slice(0, 2).map((value) => ({ body: { contains: value } })),
        readAt: null,
        title: "New supply lot posted",
        user: { role: Role.ADMIN },
      },
    });
  }

  private async resolveReviewedNotifications(notifications: Notification[]) {
    const pendingRequestNotifications = notifications.filter((notification) => !notification.readAt && notificationAccountRole(notification.title));

    if (pendingRequestNotifications.length === 0) {
      return notifications;
    }

    const accountSubjects = pendingRequestNotifications
      .map((notification) => ({
        name: notificationSubject(notification.body),
        notification,
        role: notificationAccountRole(notification.title),
      }))
      .filter((item): item is { name: string; notification: Notification; role: typeof Role.BUYER | typeof Role.FARMER } => Boolean(item.role && item.name));

    if (accountSubjects.length === 0) {
      return notifications;
    }

    const reviewedAccounts = await this.prisma.legacyUser.findMany({
      select: { name: true, role: true },
      where: {
        OR: accountSubjects.map((item) => ({
          name: item.name,
          role: item.role,
          status: { not: AccountStatus.PENDING },
        })),
      },
    });

    const reviewedAccountKeys = new Set(reviewedAccounts.map((account) => `${account.role}:${normalizedSubject(account.name)}`));
    const reviewedNotificationIds = accountSubjects
      .filter((item) => reviewedAccountKeys.has(`${item.role}:${normalizedSubject(item.name)}`))
      .map((item) => item.notification.id);

    if (reviewedNotificationIds.length === 0) {
      return notifications;
    }

    const reviewedAt = new Date();
    await this.prisma.legacyNotification.updateMany({
      data: { readAt: reviewedAt },
      where: { id: { in: reviewedNotificationIds }, readAt: null },
    });

    return notifications.map((notification) => (reviewedNotificationIds.includes(notification.id) ? { ...notification, readAt: reviewedAt } : notification));
  }
}
