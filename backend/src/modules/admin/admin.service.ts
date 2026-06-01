import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { AccountStatus, Prisma, Role } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

const accountSelect = {
  address: true,
  createdAt: true,
  district: { select: { name: true } },
  focus: true,
  id: true,
  identity: true,
  name: true,
  _count: { select: { cropLots: true, orders: true } },
  organization: true,
  cropLots: {
    orderBy: { createdAt: "desc" },
    select: {
      crop: { select: { name: true } },
      district: { select: { name: true } },
      grade: true,
      id: true,
      pricePerKg: true,
      quantityKg: true,
      status: true,
    },
    take: 3,
  },
  orders: {
    orderBy: { createdAt: "desc" },
    select: {
      deliveryAddress: true,
      district: { select: { name: true } },
      id: true,
      items: { select: { crop: { select: { name: true } }, quantityKg: true } },
      status: true,
      totalValue: true,
    },
    take: 3,
  },
  phone: true,
  reviewedAt: true,
  role: true,
  status: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

function accountRole(value?: string) {
  if (!value) {
    return undefined;
  }

  if (value === "buyer") {
    return Role.BUYER;
  }

  if (value === "farmer") {
    return Role.FARMER;
  }

  throw new BadRequestException("Unsupported account role.");
}

function accountStatus(value?: string) {
  if (!value) {
    return undefined;
  }

  const status = value.toUpperCase();
  if (status === AccountStatus.PENDING || status === AccountStatus.ACTIVE || status === AccountStatus.REJECTED) {
    return status;
  }

  throw new BadRequestException("Unsupported account status.");
}

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  pendingVerifications() {
    return this.prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: accountSelect,
      where: {
        role: { in: [Role.BUYER, Role.FARMER] },
        status: AccountStatus.PENDING,
      },
    });
  }

  accounts(filters: { role?: string; status?: string }) {
    const role = accountRole(filters.role);
    const status = accountStatus(filters.status);

    return this.prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: accountSelect,
      where: {
        role: role ?? { in: [Role.BUYER, Role.FARMER] },
        status,
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
      select: accountSelect,
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
