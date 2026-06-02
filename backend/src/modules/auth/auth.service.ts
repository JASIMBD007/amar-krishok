import { ConflictException, Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AccountStatus, Role, User } from "@prisma/client";
import { compare, hash } from "bcryptjs";
import { sign } from "jsonwebtoken";
import { NotificationsService } from "../notifications/notifications.service";
import { PrismaService } from "../prisma/prisma.service";
import { getAdminLoginName } from "./admin-login-name";
import { LoginDto, RegisterAccountDto } from "./dto/register-account.dto";

function mapLoginRole(role: LoginDto["role"]) {
  const roleMap = {
    admin: Role.ADMIN,
    buyer: Role.BUYER,
    farmer: Role.FARMER,
  } satisfies Record<LoginDto["role"], Role>;

  return roleMap[role];
}

function publicUser(user: User) {
  const { passwordHash: _passwordHash, ...safeUser } = user;
  return safeUser;
}

function normalizeLoginName(name: string) {
  return name.trim().replace(/\s+/g, " ").toLowerCase();
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
    const role = mapLoginRole(dto.role);
    const user = await this.prisma.user.findUnique({
      where: { phone_role: { phone: dto.phone, role } },
    });

    if (!user || !(await compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException("Invalid phone or password.");
    }

    if (user.role === Role.ADMIN) {
      const loginName = dto.name?.trim();
      if (!loginName) {
        throw new UnauthorizedException("Admin full name is required.");
      }

      if (normalizeLoginName(loginName) !== normalizeLoginName(getAdminLoginName(this.config))) {
        throw new UnauthorizedException("Admin name, phone, or password is invalid.");
      }
    }

    if (user.role !== Role.ADMIN && user.status !== AccountStatus.ACTIVE) {
      throw new UnauthorizedException("Account is waiting for admin verification.");
    }

    const secret = this.config.get<string>("JWT_SECRET") ?? "local-development-secret";
    const accessToken = sign({ sub: user.id, role: user.role }, secret, { expiresIn: "7d" });

    return {
      accessToken,
      user: publicUser(user),
    };
  }

  private async registerAccount(role: typeof Role.BUYER | typeof Role.FARMER, dto: RegisterAccountDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { phone_role: { phone: dto.phone, role } },
    });

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
        phone: dto.phone,
        role,
        status: AccountStatus.PENDING,
        buyerProfile: role === Role.BUYER ? { create: { buyerType: dto.buyerType } } : undefined,
        farmerProfile: role === Role.FARMER ? { create: { farmSize: dto.farmSize } } : undefined,
      },
    });

    await this.notifications.notifyAdmins({
      body: `${user.name} · ${dto.district || dto.organization || dto.phone}`,
      title: role === Role.BUYER ? "Buyer verification request" : "Farmer verification request",
    });
    await this.notifications.notifyUser(user.id, {
      body: `${dto.organization || user.name} · ${dto.district || dto.phone}`,
      title: "Registration received",
    });

    return {
      message: "Registration submitted for admin verification.",
      user: publicUser(user),
    };
  }
}
