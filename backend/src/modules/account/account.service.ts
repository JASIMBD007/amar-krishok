import { BadRequestException, ForbiddenException, Injectable } from "@nestjs/common";
import { PlatformRole, Prisma, Role } from "@prisma/client";
import { compare, hash } from "bcryptjs";
import { districtCreateData } from "../../common/catalogue-data";
import { AuthenticatedUser } from "../auth/types/authenticated-user";
import { PrismaService } from "../prisma/prisma.service";
import { UpdateProfileDto } from "./dto/update-profile.dto";
import { ChangePasswordDto, UpdateNotificationPreferencesDto, UpdatePaymentDetailsDto } from "./dto/update-profile-settings.dto";

const profileSelect = {
  address: true,
  appNotifications: true,
  avatarUrl: true,
  bio: true,
  createdAt: true,
  district: { select: { name: true } },
  focus: true,
  id: true,
  identity: true,
  nidNumber: true,
  email: true,
  name: true,
  organization: true,
  paymentAccount: true,
  paymentAccountUpdatedAt: true,
  paymentMethod: true,
  phone: true,
  payoutProof: true,
  reviewedAt: true,
  role: true,
  status: true,
  smsOrderUpdates: true,
  smsRateAlerts: true,
  upazilla: true,
  updatedAt: true,
  username: true,
  weeklySummary: true,
} satisfies Prisma.LegacyUserSelect;

function optionalText(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function platformPhone(value: string) {
  const digits = value.replace(/\D/g, "");
  const local = digits.startsWith("880") ? digits.slice(3) : digits.startsWith("0") ? digits.slice(1) : digits;
  return `+880${local}`;
}

@Injectable()
export class AccountService {
  constructor(private readonly prisma: PrismaService) {}

  me(user: AuthenticatedUser) {
    return this.prisma.legacyUser.findUniqueOrThrow({
      select: profileSelect,
      where: { id: user.id },
    });
  }

  async updateMe(user: AuthenticatedUser, dto: UpdateProfileDto) {
    const data: Prisma.LegacyUserUpdateInput = {
      address: dto.address?.trim(),
      avatarUrl: dto.avatarUrl === undefined ? undefined : optionalText(dto.avatarUrl),
      bio: dto.bio === undefined ? undefined : optionalText(dto.bio),
      email: dto.email === undefined ? undefined : optionalText(dto.email),
      focus: dto.focus?.trim(),
      identity: dto.identity?.trim(),
      name: dto.name?.trim(),
      nidNumber: dto.nidNumber === undefined ? undefined : optionalText(dto.nidNumber),
      organization: dto.organization?.trim(),
      payoutProof: dto.payoutProof?.trim(),
      upazilla: dto.upazilla?.trim(),
    };

    if (dto.district?.trim()) {
      data.district = {
        connectOrCreate: {
          create: districtCreateData(dto.district),
          where: { name: dto.district.trim() },
        },
      };
    }

    return this.prisma.legacyUser.update({
      data,
      select: profileSelect,
      where: { id: user.id },
    });
  }

  async updatePayment(user: AuthenticatedUser, dto: UpdatePaymentDetailsDto) {
    const account = await this.prisma.legacyUser.findUniqueOrThrow({
      select: { paymentAccount: true, paymentAccountUpdatedAt: true, paymentMethod: true },
      where: { id: user.id },
    });
    const paymentAccount = dto.account.trim();
    const changed = account.paymentAccount !== paymentAccount || account.paymentMethod !== dto.method;

    return this.prisma.legacyUser.update({
      data: {
        paymentAccount,
        paymentAccountUpdatedAt: changed ? new Date() : account.paymentAccountUpdatedAt,
        paymentMethod: dto.method,
      },
      select: profileSelect,
      where: { id: user.id },
    });
  }

  updateNotifications(user: AuthenticatedUser, dto: UpdateNotificationPreferencesDto) {
    return this.prisma.legacyUser.update({
      data: {
        appNotifications: dto.appNotifications,
        smsOrderUpdates: dto.smsOrderUpdates,
        smsRateAlerts: dto.smsRateAlerts,
        weeklySummary: dto.weeklySummary,
      },
      select: profileSelect,
      where: { id: user.id },
    });
  }

  async changePassword(user: AuthenticatedUser, dto: ChangePasswordDto) {
    const account = await this.prisma.legacyUser.findUniqueOrThrow({
      select: { passwordHash: true, phone: true, role: true },
      where: { id: user.id },
    });
    if (!(await compare(dto.currentPassword, account.passwordHash))) {
      throw new ForbiddenException("Current password is incorrect.");
    }
    if (await compare(dto.newPassword, account.passwordHash)) {
      throw new BadRequestException("New password must be different from the current password.");
    }

    const passwordHash = await hash(dto.newPassword, 10);
    const platformRole = account.role === Role.FARMER ? PlatformRole.FARMER : PlatformRole.BUYER;
    await this.prisma.$transaction([
      this.prisma.legacyUser.update({ data: { passwordHash }, where: { id: user.id } }),
      this.prisma.user.updateMany({
        data: { passwordHash, pinHash: passwordHash, tokenVersion: { increment: 1 } },
        where: { phone: platformPhone(account.phone), role: platformRole },
      }),
    ]);
    return { updated: true };
  }
}
