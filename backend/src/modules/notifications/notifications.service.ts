import { Injectable, NotFoundException } from "@nestjs/common";
import { Notification, Role } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

type AdminNotificationInput = {
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
    default:
      return { meta: "Backend service", section: "settings", tone: "info", type: "system" };
  }
}

function toAdminNotification(notification: Notification) {
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

  async notifyAdmins(input: AdminNotificationInput) {
    const admins = await this.prisma.user.findMany({
      select: { id: true },
      where: { role: Role.ADMIN },
    });

    if (admins.length === 0) {
      return { count: 0 };
    }

    return this.prisma.notification.createMany({
      data: admins.map((admin) => ({
        body: input.body,
        title: input.title,
        userId: admin.id,
      })),
    });
  }

  async listForUser(userId: string) {
    const notifications = await this.prisma.notification.findMany({
      orderBy: { createdAt: "desc" },
      take: 40,
      where: { userId },
    });

    return notifications.map(toAdminNotification);
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
    return toAdminNotification(notification);
  }

  async markAllRead(userId: string) {
    return this.prisma.notification.updateMany({
      data: { readAt: new Date() },
      where: { readAt: null, userId },
    });
  }
}
