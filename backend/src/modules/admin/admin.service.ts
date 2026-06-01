import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { AccountStatus, Prisma, Role } from "@prisma/client";
import { hash } from "bcryptjs";
import { NotificationsService } from "../notifications/notifications.service";
import { PrismaService } from "../prisma/prisma.service";
import { AdminCreateAccountDto, AdminUpdateAccountDto } from "./dto/account-management.dto";

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
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly prisma: PrismaService,
  ) {}

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

  notifications(userId: string) {
    return this.notificationsService.listForUser(userId);
  }

  markNotificationRead(userId: string, id: string) {
    return this.notificationsService.markRead(userId, id);
  }

  markAllNotificationsRead(userId: string) {
    return this.notificationsService.markAllRead(userId);
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

  async createAccount(dto: AdminCreateAccountDto) {
    const role = accountRole(dto.role);
    if (!role) {
      throw new BadRequestException("Unsupported account role.");
    }

    const existingUser = await this.prisma.user.findUnique({
      where: { phone_role: { phone: dto.phone, role } },
    });
    if (existingUser) {
      throw new ConflictException("An account with this role and phone already exists.");
    }

    const district = await this.prisma.district.upsert({
      create: { name: dto.district },
      update: { active: true },
      where: { name: dto.district },
    });
    const status = accountStatus(dto.status) ?? AccountStatus.ACTIVE;
    const passwordHash = await hash(dto.password, 10);

    return this.prisma.user.create({
      data: {
        address: dto.address,
        buyerProfile: role === Role.BUYER ? { create: {} } : undefined,
        districtId: district.id,
        farmerProfile: role === Role.FARMER ? { create: {} } : undefined,
        focus: dto.focus,
        identity: dto.identity,
        name: dto.name,
        organization: dto.organization,
        passwordHash,
        phone: dto.phone,
        reviewedAt: status === AccountStatus.PENDING ? undefined : new Date(),
        role,
        status,
      },
      select: accountSelect,
    });
  }

  async updateAccount(id: string, dto: AdminUpdateAccountDto) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user || (user.role !== Role.BUYER && user.role !== Role.FARMER)) {
      throw new NotFoundException("Account not found.");
    }

    if (dto.phone && dto.phone !== user.phone) {
      const existingUser = await this.prisma.user.findUnique({
        where: { phone_role: { phone: dto.phone, role: user.role } },
      });
      if (existingUser) {
        throw new ConflictException("An account with this role and phone already exists.");
      }
    }

    const status = accountStatus(dto.status);
    const data: Prisma.UserUpdateInput = {
      address: dto.address?.trim(),
      focus: dto.focus?.trim(),
      identity: dto.identity?.trim(),
      name: dto.name?.trim(),
      organization: dto.organization?.trim(),
      phone: dto.phone?.trim(),
      reviewedAt: status ? new Date() : undefined,
      status,
    };

    if (dto.password) {
      data.passwordHash = await hash(dto.password, 10);
    }

    if (dto.district?.trim()) {
      data.district = {
        connectOrCreate: {
          create: { name: dto.district.trim() },
          where: { name: dto.district.trim() },
        },
      };
    }

    return this.prisma.user.update({
      data,
      select: accountSelect,
      where: { id },
    });
  }

  async deleteAccount(id: string) {
    const user = await this.prisma.user.findUnique({
      include: { _count: { select: { cropLots: true, orders: true, payouts: true } } },
      where: { id },
    });
    if (!user || (user.role !== Role.BUYER && user.role !== Role.FARMER)) {
      throw new NotFoundException("Account not found.");
    }

    if (user._count.orders > 0 || user._count.cropLots > 0 || user._count.payouts > 0) {
      throw new BadRequestException("Accounts with order, crop lot, or payout records cannot be deleted. Update status instead.");
    }

    await this.prisma.$transaction([
      this.prisma.chatMessage.updateMany({ data: { senderId: null }, where: { senderId: id } }),
      this.prisma.uploadedFile.updateMany({ data: { ownerId: null }, where: { ownerId: id } }),
      this.prisma.auditLog.updateMany({ data: { actorId: null }, where: { actorId: id } }),
      this.prisma.user.delete({ where: { id } }),
    ]);
    return { id };
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
