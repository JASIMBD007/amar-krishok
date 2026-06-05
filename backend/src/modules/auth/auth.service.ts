import { ConflictException, Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AccountStatus, Role, User } from "@prisma/client";
import { compare, hash } from "bcryptjs";
import { sign } from "jsonwebtoken";
import { NotificationsService } from "../notifications/notifications.service";
import { PrismaService } from "../prisma/prisma.service";
import { LoginDto, RegisterAccountDto } from "./dto/register-account.dto";
import { normalizeUsername } from "./username";

function publicUser(user: User) {
  const { passwordHash: _passwordHash, ...safeUser } = user;
  return safeUser;
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
    const user =
      role === Role.ADMIN
        ? await this.prisma.user.findUnique({
            where: { username: normalizeUsername(dto.username ?? "") },
          })
        : await this.prisma.user.findUnique({
            where: { phone_role: { phone: dto.phone?.trim() ?? "", role } },
          });

    if (!user || user.role !== role || !(await compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException(role === Role.ADMIN ? "Invalid username or password." : "Invalid mobile number or password.");
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
    const username = normalizeUsername(dto.username);
    const [existingUsername, existingUser] = await Promise.all([
      this.prisma.user.findUnique({ where: { username } }),
      this.prisma.user.findUnique({
        where: { phone_role: { phone: dto.phone, role } },
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
        phone: dto.phone,
        role,
        status: AccountStatus.PENDING,
        upazilla: dto.upazilla,
        username,
        buyerProfile: role === Role.BUYER ? { create: { buyerType: dto.buyerType } } : undefined,
        farmerProfile: role === Role.FARMER ? { create: { farmSize: dto.farmSize } } : undefined,
      },
    });

    await this.notifications.notifyAdmins({
      body: `${user.name} · ${dto.upazilla || dto.district || dto.organization || dto.phone}`,
      title: role === Role.BUYER ? "Buyer verification request" : "Farmer verification request",
    });
    await this.notifications.notifyUser(user.id, {
      body: `${dto.organization || user.name} · ${dto.upazilla || dto.district || dto.phone}`,
      title: "Registration received",
    });

    return {
      message: "Registration submitted for admin verification.",
      user: publicUser(user),
    };
  }
}
