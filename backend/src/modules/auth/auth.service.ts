import { ConflictException, ForbiddenException, Injectable, ServiceUnavailableException, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AccountStatus, LegacyUser as User, PasswordResetStatus, PlatformRole, PlatformUserStatus, Role } from "@prisma/client";
import { districtCreateData } from "../../common/catalogue-data";
import { compare, hash } from "bcryptjs";

/** bcrypt work factor for new password hashes. Existing hashes keep verifying at their own cost. */
export const PASSWORD_HASH_ROUNDS = 12;
import { sign } from "jsonwebtoken";
import { NotificationsService } from "../notifications/notifications.service";
import { PrismaService } from "../prisma/prisma.service";
import { LoginDto, PasswordResetConfirmDto, PasswordResetLookupDto, RegisterAccountDto } from "./dto/register-account.dto";
import { requireJwtSecret } from "./jwt-secret";
import { normalizeUsername } from "./username";

function publicUser(user: User) {
  const { passwordHash: _passwordHash, ...safeUser } = user;
  return safeUser;
}

function registrationUsername(role: typeof Role.BUYER | typeof Role.FARMER, phone: string, providedUsername?: string) {
  const explicitUsername = normalizeUsername(providedUsername ?? "");
  if (explicitUsername) {
    return explicitUsername;
  }

  const phoneKey = phone.replace(/\D/g, "").slice(0, 24) || phone.toLowerCase().replace(/[^a-z0-9._-]/g, "").slice(0, 24) || "account";
  return normalizeUsername(`${role === Role.BUYER ? "buyer" : "farmer"}-${phoneKey}`);
}

function platformPhone(value: string) {
  const digits = value.replace(/\D/g, "");
  const local = digits.startsWith("880") ? digits.slice(3) : digits.startsWith("0") ? digits.slice(1) : digits;
  return `+880${local}`;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly config: ConfigService,
    private readonly notifications: NotificationsService,
    private readonly prisma: PrismaService,
  ) {}

  registerBuyer(dto: RegisterAccountDto) {
    return this.registerAccount(Role.BUYER, dto);
  }

  registerFarmer(dto: RegisterAccountDto) {
    return this.registerAccount(Role.FARMER, dto);
  }

  async login(dto: LoginDto) {
    const role = dto.role;
    const username = normalizeUsername(dto.username ?? "");
    const phone = dto.phone?.trim() ?? "";
    const user =
      role === Role.ADMIN
        ? username
          ? await this.prisma.legacyUser.findUnique({
              where: { username },
            })
          : null
        : phone
          ? await this.prisma.legacyUser.findUnique({
              where: { phone_role: { phone, role } },
            })
          : null;

    if (!user || user.role !== role || !(await compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException(role === Role.ADMIN ? "Invalid username or password." : "Invalid mobile number or password.");
    }

    if (user.role !== Role.ADMIN && user.status !== AccountStatus.ACTIVE) {
      throw new UnauthorizedException("Account is waiting for admin verification.");
    }

    if (dto.client === "mobile") {
      if (user.role !== Role.BUYER && user.role !== Role.FARMER) {
        throw new ForbiddenException("The mobile app is available to buyer and farmer website accounts.");
      }
      return this.issueMobileSession(user, dto);
    }

    const secret = requireJwtSecret(this.config);
    // The version travels in the token so a password change can invalidate it; see LegacyUser.tokenVersion.
    const accessToken = sign({ sub: user.id, role: user.role, version: user.tokenVersion }, secret, {
      algorithm: "HS256",
      expiresIn: "7d",
    });

    return {
      accessToken,
      user: publicUser(user),
    };
  }

  lookupPasswordResetAccount(_dto: PasswordResetLookupDto) {
    return {
      message: "If this account exists, a password reset request can be submitted for admin review.",
    };
  }

  async resetPassword(dto: PasswordResetConfirmDto) {
    const cleanPhone = dto.phone.trim();
    // Hash before the lookup (and unconditionally) so the response time doesn't reveal whether the account exists.
    const [passwordHash, user] = await Promise.all([
      hash(dto.password, PASSWORD_HASH_ROUNDS),
      this.prisma.legacyUser.findUnique({
        where: { phone_role: { phone: cleanPhone, role: dto.role } },
      }),
    ]);

    if (!user || (user.role !== Role.BUYER && user.role !== Role.FARMER)) {
      return {
        message: "Password reset request sent. Admin will review it before the password changes.",
      };
    }

    const request = await this.prisma.$transaction(async (tx) => {
      await tx.passwordResetRequest.updateMany({
        data: { passwordHash: "", reviewedAt: new Date(), status: PasswordResetStatus.REJECTED },
        where: { status: PasswordResetStatus.PENDING, userId: user.id },
      });

      return tx.passwordResetRequest.create({
        data: {
          passwordHash,
          phone: cleanPhone,
          role: user.role,
          userId: user.id,
        },
      });
    });

    await this.notifications.markPasswordResetRequestNotificationsReviewed({
      phone: cleanPhone,
      user,
    });
    await this.notifications.notifyAdmins({
      body: `${user.name} · ${cleanPhone} · ${user.role === Role.BUYER ? "Buyer" : "Seller / Farmer"} · ${request.id}`,
      title: "Password reset request",
    });
    await this.notifications.notifyUser(user.id, {
      body: "Your AmarKrishok password reset request is waiting for admin approval.",
      title: "Password reset requested",
    });

    return {
      message: "Password reset request sent. Admin will review it before the password changes.",
    };
  }

  private async registerAccount(role: typeof Role.BUYER | typeof Role.FARMER, dto: RegisterAccountDto) {
    const cleanPhone = dto.phone.trim();
    const username = registrationUsername(role, cleanPhone, dto.username);
    const [existingUsername, existingUser, phoneHolder] = await Promise.all([
      this.prisma.legacyUser.findUnique({ where: { username } }),
      this.prisma.legacyUser.findUnique({
        where: { phone_role: { phone: cleanPhone, role } },
      }),
      // One number, one person, one account. The table still allows a buyer and a farmer row to
      // share a phone, which is how the same person ended up with two accounts and support
      // messages landing on whichever one staff happened to click.
      this.prisma.legacyUser.findFirst({
        where: { phone: cleanPhone, role: { in: [Role.BUYER, Role.FARMER] }, status: { not: AccountStatus.REJECTED } },
      }),
    ]);

    if (existingUsername && existingUsername.id !== existingUser?.id) {
      throw new ConflictException("This username is already taken.");
    }

    if (existingUser && existingUser.status !== AccountStatus.REJECTED) {
      throw new ConflictException("An account with this role and phone already exists.");
    }

    if (phoneHolder && phoneHolder.id !== existingUser?.id) {
      throw new ConflictException("This mobile number already has an AmarKrishok account.");
    }

    if (existingUser) {
      await this.prisma.legacyUser.delete({ where: { id: existingUser.id } });
    }

    const district = await this.prisma.district.upsert({
      create: districtCreateData(dto.district),
      update: { active: true },
      where: { name: dto.district },
    });
    const passwordHash = await hash(dto.password, PASSWORD_HASH_ROUNDS);

    const user = await this.prisma.legacyUser.create({
      data: {
        address: dto.address,
        districtId: district.id,
        focus: dto.focus,
        identity: dto.identity,
        name: dto.name,
        organization: dto.organization,
        passwordHash,
        phone: cleanPhone,
        role,
        status: AccountStatus.PENDING,
        upazilla: dto.upazilla,
        username,
        buyerProfile: role === Role.BUYER ? { create: { buyerType: dto.buyerType } } : undefined,
        farmerProfile: role === Role.FARMER ? { create: { farmSize: dto.farmSize } } : undefined,
      },
    });

    await this.notifications.notifyAdmins({
      body: `${user.name} · ${dto.upazilla || dto.district || dto.organization || cleanPhone}`,
      title: role === Role.BUYER ? "Buyer verification request" : "Farmer verification request",
    });
    await this.notifications.notifyUser(user.id, {
      body: `${dto.organization || user.name} · ${dto.upazilla || dto.district || cleanPhone}`,
      title: "Registration received",
    });

    return {
      message: "Registration submitted for admin verification.",
      user: publicUser(user),
    };
  }

  private async issueMobileSession(legacy: User, dto: LoginDto) {
    const role = legacy.role === Role.BUYER ? PlatformRole.BUYER : PlatformRole.FARMER;
    const phone = platformPhone(legacy.phone);
    const district = legacy.districtId
      ? await this.prisma.district.findUnique({ where: { id: legacy.districtId } })
      : await this.prisma.district.findFirst({ where: { active: true }, orderBy: { nameEn: "asc" } });
    if (!district) {
      throw new ServiceUnavailableException("No active district is configured.");
    }

    const existing = await this.prisma.user.findUnique({ where: { phone } });
    if (existing && existing.role !== role) {
      throw new ForbiddenException("This mobile number belongs to another account role.");
    }
    const account = await this.prisma.user.upsert({
      where: { phone },
      update: {
        address: legacy.address,
        districtId: district.id,
        focus: legacy.focus,
        identity: legacy.identity,
        name: legacy.name,
        organization: legacy.organization,
        passwordHash: legacy.passwordHash,
        role,
        status: PlatformUserStatus.ACTIVE,
        upazila: legacy.upazilla ?? district.nameBn,
      },
      create: {
        address: legacy.address,
        districtId: district.id,
        focus: legacy.focus,
        identity: legacy.identity,
        name: legacy.name,
        organization: legacy.organization,
        passwordHash: legacy.passwordHash,
        phone,
        pinHash: legacy.passwordHash,
        role,
        status: PlatformUserStatus.ACTIVE,
        upazila: legacy.upazilla ?? district.nameBn,
      },
      include: { district: true, kycProfile: true },
    });

    if (dto.deviceId) {
      await this.prisma.device.upsert({
        where: { id: dto.deviceId },
        update: { lastSeenAt: new Date(), pushToken: dto.pushToken, revokedAt: null, userId: account.id },
        create: { id: dto.deviceId, label: dto.platform ?? "mobile", lastSeenAt: new Date(), pushToken: dto.pushToken, userId: account.id },
      });
    }

    const secret = requireJwtSecret(this.config);
    const accessToken = sign({ platform: true, role: account.role, version: account.tokenVersion }, secret, { algorithm: "HS256", expiresIn: "15m", subject: account.id });
    const refreshToken = sign({ kind: "refresh", platform: true, version: account.tokenVersion }, secret, { algorithm: "HS256", expiresIn: "30d", subject: account.id });
    return {
      accessToken,
      refreshToken,
      user: {
        district: account.district.nameBn,
        id: account.id,
        name: account.name,
        phone: account.phone,
        role: account.role,
        status: account.status,
        verified: account.kycProfile?.status === "VERIFIED",
      },
    };
  }

}
