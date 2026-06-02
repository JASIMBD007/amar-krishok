import { Injectable, NotFoundException } from "@nestjs/common";
import { Notification, Role } from "@prisma/client";
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
      return { meta: "Supply Lots", section: "supply", tone: "success", type: "supply" };
    case "Registration received":
      return { meta: "Account verification", section: "profile", tone: "info", type: "account" };
    case "Account verified":
      return { meta: "Account approved", section: "profile", tone: "success", type: "account" };
    case "Account review update":
      return { meta: "Account verification", section: "profile", tone: "warning", type: "account" };
    case "Order request received":
      return { meta: "Order update", section: "orders", tone: "success", type: "order" };
    case "Order status update":
      return { meta: "Order update", section: "orders", tone: "info", type: "order" };
    case "New order for your lot":
      return { meta: "Buyer demand", section: "orders", tone: "urgent", type: "order" };
    case "Crop lot published":
      return { meta: "Supply Lots", section: "supply", tone: "success", type: "supply" };
    case "Lot status update":
      return { meta: "Supply Lots", section: "supply", tone: "info", type: "supply" };
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

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async notifyAdmins(input: NotificationInput) {
    const admins = await this.prisma.user.findMany({
      select: { id: true },
      where: { role: Role.ADMIN },
    });

    return this.notifyUsers(admins.map((admin) => admin.id), input);
  }

  async notifyUser(userId: string | null | undefined, input: NotificationInput) {
    if (!userId) {
      return null;
    }

    return this.prisma.notification.create({
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

    return this.prisma.notification.createMany({
      data: uniqueUserIds.map((userId) => ({
        body: input.body,
        title: input.title,
        userId,
      })),
      skipDuplicates: false,
    });
  }

  async listForUser(userId: string) {
    const notifications = await this.prisma.notification.findMany({
      orderBy: { createdAt: "desc" },
      take: 40,
      where: { userId },
    });

    return notifications.map(toNotification);
  }

  async markRead(userId: string, id: string) {
    const result = await this.prisma.notification.updateMany({
      data: { readAt: new Date() },
      where: { id, userId },
    });

    if (result.count === 0) {
      throw new NotFoundException("Notification not found.");
    }

    const notification = await this.prisma.notification.findUniqueOrThrow({ where: { id } });
    return toNotification(notification);
  }

  async markAllRead(userId: string) {
    return this.prisma.notification.updateMany({
      data: { readAt: new Date() },
      where: { readAt: null, userId },
    });
  }
}
