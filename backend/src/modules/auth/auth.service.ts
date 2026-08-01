import { ConflictException, Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AccountStatus, PasswordResetStatus, Role, User } from "@prisma/client";
import { compare, hash } from "bcryptjs";
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
          ? await this.prisma.user.findUnique({
              where: { username },
            })
          : null
        : phone
          ? await this.prisma.user.findUnique({
              where: { phone_role: { phone, role } },
            })
          : null;

    if (!user || user.role !== role || !(await compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException(role === Role.ADMIN ? "Invalid username or password." : "Invalid mobile number or password.");
    }

    if (user.role !== Role.ADMIN && user.status !== AccountStatus.ACTIVE) {
      throw new UnauthorizedException("Account is waiting for admin verification.");
    }

    const secret = requireJwtSecret(this.config);
    const accessToken = sign({ sub: user.id, role: user.role }, secret, { algorithm: "HS256", expiresIn: "7d" });

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
      hash(dto.password, 10),
      this.prisma.user.findUnique({
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
    const [existingUsername, existingUser] = await Promise.all([
      this.prisma.user.findUnique({ where: { username } }),
      this.prisma.user.findUnique({
        where: { phone_role: { phone: cleanPhone, role } },
      }),
    ]);

    if (existingUsername && existingUsername.id !== existingUser?.id) {
      throw new ConflictException("This username is already taken.");
    }

    if (existingUser && existingUser.status !== AccountStatus.REJECTED) {
      throw new ConflictException("An account with this role and phone already exists.");
    }

    if (existingUser) {
      await this.prisma.user.delete({ where: { id: existingUser.id } });
    }

    const district = await this.prisma.district.upsert({
      create: { name: dto.district },
      update: { active: true },
      where: { name: dto.district },
    });
    const passwordHash = await hash(dto.password, 10);

    const user = await this.prisma.user.create({
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

}
