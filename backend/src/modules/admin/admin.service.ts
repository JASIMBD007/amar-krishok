import { Injectable, NotFoundException } from "@nestjs/common";
import { AccountStatus, Role } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  pendingVerifications() {
    return this.prisma.user.findMany({
      include: { district: true },
      orderBy: { createdAt: "desc" },
      where: {
        role: { in: [Role.BUYER, Role.FARMER] },
        status: AccountStatus.PENDING,
      },
    });
  }

  async updateVerification(id: string, action: "approve" | "reject") {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException("Registration not found.");
    }

    return this.prisma.user.update({
      data: {
        reviewedAt: new Date(),
        status: action === "approve" ? AccountStatus.ACTIVE : AccountStatus.REJECTED,
      },
      where: { id },
    });
  }

  async dashboard() {
    const [pendingVerifications, activeLots, openOrders, waitingChats] = await Promise.all([
      this.prisma.user.count({ where: { role: { in: [Role.BUYER, Role.FARMER] }, status: AccountStatus.PENDING } }),
      this.prisma.cropLot.count({ where: { status: "ACTIVE" } }),
      this.prisma.order.count({ where: { status: { notIn: ["COMPLETED", "CANCELLED"] } } }),
      this.prisma.chatThread.count({ where: { status: "WAITING" } }),
    ]);

    return {
      activeLots,
      openOrders,
      pendingVerifications,
      waitingChats,
    };
  }
}
