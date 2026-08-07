import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { AccountStatus, PasswordResetStatus, Prisma, Role } from "@prisma/client";
import { districtCreateData } from "../../common/catalogue-data";
import { hash } from "bcryptjs";
import { NotificationsService } from "../notifications/notifications.service";
import { PrismaService } from "../prisma/prisma.service";
import { normalizeUsername } from "../auth/username";
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
      createdAt: true,
      crop: { select: { name: true } },
      district: { select: { name: true } },
      grade: true,
      harvestDate: true,
      id: true,
      imageUrl: true,
      notes: true,
      pricePerKg: true,
      quantityKg: true,
      status: true,
      upazilla: true,
      updatedAt: true,
    },
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
      upazilla: true,
    },
    take: 3,
  },
  phone: true,
  reviewedAt: true,
  role: true,
  status: true,
  upazilla: true,
  updatedAt: true,
  username: true,
} satisfies Prisma.LegacyUserSelect;

const passwordResetSelect = {
  id: true,
  phone: true,
  requestedAt: true,
  reviewedAt: true,
  reviewedBy: { select: { id: true, name: true } },
  role: true,
  status: true,
  user: {
    select: {
      district: { select: { name: true } },
      id: true,
      name: true,
      organization: true,
      phone: true,
      role: true,
      status: true,
      upazilla: true,
      username: true,
    },
  },
} satisfies Prisma.PasswordResetRequestSelect;

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
    return this.prisma.legacyUser.findMany({
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

  passwordResetRequests() {
    return this.prisma.passwordResetRequest.findMany({
      orderBy: { requestedAt: "desc" },
      select: passwordResetSelect,
      take: 60,
    });
  }

  accounts(filters: { role?: string; status?: string }) {
    const role = accountRole(filters.role);
    const status = accountStatus(filters.status);

    return this.prisma.legacyUser.findMany({
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

    const username = normalizeUsername(dto.username);
    const [existingUsername, existingUser] = await Promise.all([
      this.prisma.legacyUser.findUnique({ where: { username } }),
      this.prisma.legacyUser.findUnique({
        where: { phone_role: { phone: dto.phone, role } },
      }),
    ]);
    if (existingUsername) {
      throw new ConflictException("This username is already taken.");
    }
    if (existingUser) {
      throw new ConflictException("An account with this role and phone already exists.");
    }

    const district = await this.prisma.district.upsert({
      create: districtCreateData(dto.district),
      update: { active: true },
      where: { name: dto.district },
    });
    const status = accountStatus(dto.status) ?? AccountStatus.ACTIVE;
    const passwordHash = await hash(dto.password, 10);

    return this.prisma.legacyUser.create({
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
        upazilla: dto.upazilla,
        username,
      },
      select: accountSelect,
    });
  }

  async updateAccount(id: string, dto: AdminUpdateAccountDto) {
    const user = await this.prisma.legacyUser.findUnique({ where: { id } });
    if (!user || (user.role !== Role.BUYER && user.role !== Role.FARMER)) {
      throw new NotFoundException("Account not found.");
    }

    if (dto.phone && dto.phone !== user.phone) {
      const existingUser = await this.prisma.legacyUser.findUnique({
        where: { phone_role: { phone: dto.phone, role: user.role } },
      });
      if (existingUser) {
        throw new ConflictException("An account with this role and phone already exists.");
      }
    }

    if (dto.username && normalizeUsername(dto.username) !== user.username) {
      const existingUsername = await this.prisma.legacyUser.findUnique({ where: { username: normalizeUsername(dto.username) } });
      if (existingUsername) {
        throw new ConflictException("This username is already taken.");
      }
    }

    const status = accountStatus(dto.status);
    const data: Prisma.LegacyUserUpdateInput = {
      address: dto.address?.trim(),
      focus: dto.focus?.trim(),
      identity: dto.identity?.trim(),
      name: dto.name?.trim(),
      organization: dto.organization?.trim(),
      phone: dto.phone?.trim(),
      reviewedAt: status ? new Date() : undefined,
      status,
      upazilla: dto.upazilla?.trim(),
      username: dto.username ? normalizeUsername(dto.username) : undefined,
    };

    if (dto.password) {
      data.passwordHash = await hash(dto.password, 10);
    }

    if (dto.district?.trim()) {
      data.district = {
        connectOrCreate: {
          create: districtCreateData(dto.district),
          where: { name: dto.district.trim() },
        },
      };
    }

    const updatedAccount = await this.prisma.legacyUser.update({
      data,
      select: accountSelect,
      where: { id },
    });

    if (status && status !== AccountStatus.PENDING) {
      await this.notificationsService.markVerificationRequestNotificationsReviewed(updatedAccount);
    }

    return updatedAccount;
  }

  async deleteAccount(id: string) {
    const user = await this.prisma.legacyUser.findUnique({
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
      this.prisma.legacyAuditLog.updateMany({ data: { actorId: null }, where: { actorId: id } }),
      this.prisma.legacyUser.delete({ where: { id } }),
    ]);
    return { id };
  }

  async approvePasswordReset(id: string, adminId: string) {
    const request = await this.prisma.passwordResetRequest.findUnique({
      include: { user: true },
      where: { id },
    });

    if (!request || request.status !== PasswordResetStatus.PENDING) {
      throw new NotFoundException("Pending password reset request not found.");
    }

    const reviewedAt = new Date();
    const updatedRequest = await this.prisma.$transaction(async (tx) => {
      await tx.legacyUser.update({
        data: { passwordHash: request.passwordHash },
        where: { id: request.userId },
      });

      return tx.passwordResetRequest.update({
        data: {
          passwordHash: "",
          reviewedAt,
          reviewedBy: { connect: { id: adminId } },
          status: PasswordResetStatus.APPROVED,
        },
        select: passwordResetSelect,
        where: { id },
      });
    });

    await this.notificationsService.markPasswordResetRequestNotificationsReviewed(updatedRequest);
    await this.notificationsService.notifyUser(request.userId, {
      body: "Your AmarKrishok password reset was approved. You can now log in with the new password.",
      title: "Password reset approved",
    });

    return updatedRequest;
  }

  async rejectPasswordReset(id: string, adminId: string) {
    const request = await this.prisma.passwordResetRequest.findUnique({
      include: { user: true },
      where: { id },
    });

    if (!request || request.status !== PasswordResetStatus.PENDING) {
      throw new NotFoundException("Pending password reset request not found.");
    }

    const updatedRequest = await this.prisma.passwordResetRequest.update({
      data: {
        passwordHash: "",
        reviewedAt: new Date(),
        reviewedBy: { connect: { id: adminId } },
        status: PasswordResetStatus.REJECTED,
      },
      select: passwordResetSelect,
      where: { id },
    });

    await this.notificationsService.markPasswordResetRequestNotificationsReviewed(updatedRequest);
    await this.notificationsService.notifyUser(request.userId, {
      body: "Your AmarKrishok password reset request was reviewed. Please contact support if you still need help.",
      title: "Password reset rejected",
    });

    return updatedRequest;
  }

  async updateVerification(id: string, action: "approve" | "reject") {
    const user = await this.prisma.legacyUser.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException("Registration not found.");
    }

    const updatedUser = await this.prisma.legacyUser.update({
      data: {
        reviewedAt: new Date(),
        status: action === "approve" ? AccountStatus.ACTIVE : AccountStatus.REJECTED,
      },
      select: accountSelect,
      where: { id },
    });

    await this.notificationsService.markVerificationRequestNotificationsReviewed(updatedUser);
    await this.notificationsService.notifyUser(updatedUser.id, {
      body:
        action === "approve"
          ? "Your AmarKrishok account is active. You can now log in and use your dashboard."
          : "Your registration was reviewed. Please contact AmarKrishok support for the next step.",
      title: action === "approve" ? "Account verified" : "Account review update",
    });

    return updatedUser;
  }

  async dashboard() {
    const [pendingVerifications, activeLots, openOrders, waitingChats] = await Promise.all([
      this.prisma.legacyUser.count({ where: { role: { in: [Role.BUYER, Role.FARMER] }, status: AccountStatus.PENDING } }),
      this.prisma.cropLot.count({ where: { status: "ACTIVE" } }),
      this.prisma.legacyOrder.count({ where: { status: { notIn: ["COMPLETED", "CANCELLED"] } } }),
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
