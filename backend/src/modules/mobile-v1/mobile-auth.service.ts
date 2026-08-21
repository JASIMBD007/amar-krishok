import { BadRequestException, ConflictException, ForbiddenException, Injectable, ServiceUnavailableException, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AccountStatus, PlatformRole, PlatformUserStatus, Role } from "@prisma/client";
import { compare, hash } from "bcryptjs";
import { sign, verify } from "jsonwebtoken";

import { requireJwtSecret } from "../auth/jwt-secret";
import { NotificationsService } from "../notifications/notifications.service";
import { PrismaService } from "../prisma/prisma.service";

type PasswordLoginInput = { deviceId?: string; password: string; phone: string; platform?: string; pushToken?: string; role: PlatformRole };
type RegistrationInput = {
  address: string;
  district: string;
  focus: string;
  identity: string;
  name: string;
  organization: string;
  password: string;
  phone: string;
  role: PlatformRole;
  upazila: string;
};

function internationalPhone(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.startsWith("880")) return `+${digits}`;
  if (digits.startsWith("0")) return `+88${digits}`;
  return `+880${digits}`;
}

function websitePhone(value: string) {
  return `0${internationalPhone(value).slice(4)}`;
}

function legacyRole(role: PlatformRole) {
  if (role === PlatformRole.BUYER) return Role.BUYER;
  if (role === PlatformRole.FARMER) return Role.FARMER;
  return null;
}

@Injectable()
export class MobileAuthService {

  constructor(
    private readonly config: ConfigService,
    private readonly notifications: NotificationsService,
    private readonly prisma: PrismaService,
  ) {}

  async register(input: RegistrationInput) {
    this.assertMobileRole(input.role);
    if (input.role === PlatformRole.CARRIER) {
      throw new BadRequestException({ error: { code: "CARRIER_INVITE_REQUIRED", message: "Logistics accounts are created by AmarKrishok staff.", messageBn: "পরিবহন অংশীদারের অ্যাকাউন্ট আমার কৃষক কর্মীরা তৈরি করেন।" } });
    }
    const required = [input.name, input.organization, input.district, input.upazila, input.address, input.identity, input.focus];
    if (required.some((value) => !value?.trim())) throw new BadRequestException("All registration fields are required.");
    if (input.password.length < 4) throw new BadRequestException("Password must contain at least four characters.");

    const phone = internationalPhone(input.phone);
    this.assertPhone(phone);
    const role = legacyRole(input.role)!;
    const localPhone = websitePhone(phone);
    const [platformAccount, websiteAccount, district] = await Promise.all([
      this.prisma.user.findUnique({ where: { phone } }),
      this.prisma.legacyUser.findUnique({ where: { phone_role: { phone: localPhone, role } } }),
      this.prisma.district.findFirst({ where: { OR: [{ id: input.district }, { name: input.district }, { nameBn: input.district }, { nameEn: input.district }] } }),
    ]);
    if (!district) throw new BadRequestException("Please select a service district.");
    if (platformAccount || (websiteAccount && websiteAccount.status !== AccountStatus.REJECTED)) {
      throw new ConflictException("An account with this mobile number already exists.");
    }
    const passwordHash = await hash(input.password, 12);
    const username = `${role === Role.BUYER ? "buyer" : "farmer"}-${localPhone.replace(/\D/g, "")}`;
    const result = await this.prisma.$transaction(async (tx) => {
      if (websiteAccount) await tx.legacyUser.delete({ where: { id: websiteAccount.id } });
      const legacy = await tx.legacyUser.create({
        data: {
          address: input.address.trim(),
          buyerProfile: role === Role.BUYER ? { create: {} } : undefined,
          districtId: district.id,
          farmerProfile: role === Role.FARMER ? { create: {} } : undefined,
          focus: input.focus.trim(),
          identity: input.identity.trim(),
          name: input.name.trim(),
          organization: input.organization.trim(),
          passwordHash,
          phone: localPhone,
          role,
          status: AccountStatus.PENDING,
          upazilla: input.upazila.trim(),
          username,
        },
      });
      const platform = await tx.user.create({
        data: {
          address: input.address.trim(),
          districtId: district.id,
          focus: input.focus.trim(),
          identity: input.identity.trim(),
          name: input.name.trim(),
          organization: input.organization.trim(),
          passwordHash,
          phone,
          pinHash: passwordHash,
          role: input.role,
          status: PlatformUserStatus.PENDING,
          upazila: input.upazila.trim(),
        },
      });
      return { legacy, platform };
    });
    await this.notifications.notifyAdmins({
      body: `${result.legacy.name} · ${input.upazila.trim()} · ${input.organization.trim()}`,
      title: role === Role.BUYER ? "Buyer verification request" : "Farmer verification request",
    });
    await this.notifications.notifyUser(result.legacy.id, {
      body: `${input.organization.trim()} · ${input.upazila.trim()}`,
      title: "Registration received",
    });
    return { message: "Registration submitted for admin verification.", status: result.platform.status };
  }

  async loginWithPassword(input: PasswordLoginInput) {
    this.assertMobileRole(input.role);
    const phone = internationalPhone(input.phone);
    this.assertPhone(phone);
    const mappedRole = legacyRole(input.role);
    const legacy = mappedRole
      ? await this.prisma.legacyUser.findUnique({ where: { phone_role: { phone: websitePhone(phone), role: mappedRole } }, include: { district: true } })
      : null;
    if (legacy) {
      if (!(await compare(input.password, legacy.passwordHash))) {
        throw new UnauthorizedException({ error: { code: "INVALID_CREDENTIALS", message: "Invalid mobile number or password.", messageBn: "মোবাইল নম্বর অথবা পাসওয়ার্ড সঠিক নয়।" } });
      }
      if (legacy.status !== AccountStatus.ACTIVE) {
        throw new UnauthorizedException({ error: { code: "ACCOUNT_PENDING", message: "Account is waiting for admin verification.", messageBn: "অ্যাকাউন্টটি এখনো অ্যাডমিন যাচাইয়ের অপেক্ষায় আছে।" } });
      }
      const existing = await this.prisma.user.findUnique({ where: { phone } });
      if (existing && existing.role !== input.role) {
        throw new ForbiddenException({ error: { code: "ROLE_MISMATCH", message: "This mobile number belongs to another account role.", messageBn: "এই মোবাইল নম্বরটি অন্য ধরনের অ্যাকাউন্টের জন্য নিবন্ধিত।" } });
      }
      const district = legacy.district ?? await this.prisma.district.findFirst({ where: { active: true }, orderBy: { nameEn: "asc" } });
      if (!district) throw new ServiceUnavailableException({ error: { code: "DISTRICT_UNAVAILABLE", message: "No active district is configured.", messageBn: "এই মুহূর্তে কোনো সক্রিয় জেলা কনফিগার করা নেই।" } });
      const account = await this.prisma.user.upsert({
        where: { phone },
        update: { address: legacy.address, districtId: district.id, focus: legacy.focus, identity: legacy.identity, name: legacy.name, organization: legacy.organization, passwordHash: legacy.passwordHash, role: input.role, status: PlatformUserStatus.ACTIVE, upazila: legacy.upazilla ?? "" },
        create: { address: legacy.address, districtId: district.id, focus: legacy.focus, identity: legacy.identity, name: legacy.name, organization: legacy.organization, passwordHash: legacy.passwordHash, phone, pinHash: legacy.passwordHash, role: input.role, status: PlatformUserStatus.ACTIVE, upazila: legacy.upazilla ?? "" },
      });
      await this.registerDevice(account.id, input);
      return this.issueTokens(account);
    }

    const account = await this.prisma.user.findUnique({ where: { phone } });
    if (!account || account.role !== input.role || !(await compare(input.password, account.passwordHash ?? account.pinHash))) {
      throw new UnauthorizedException({ error: { code: "INVALID_CREDENTIALS", message: "Invalid mobile number, password, or account role.", messageBn: "মোবাইল নম্বর, পাসওয়ার্ড অথবা অ্যাকাউন্টের ধরন সঠিক নয়।" } });
    }
    if (account.status !== PlatformUserStatus.ACTIVE) {
      throw new UnauthorizedException({ error: { code: "ACCOUNT_PENDING", message: "Account is waiting for admin verification.", messageBn: "অ্যাকাউন্টটি এখনো অ্যাডমিন যাচাইয়ের অপেক্ষায় আছে।" } });
    }
    await this.registerDevice(account.id, input);
    return this.issueTokens(account);
  }

  async refresh(refreshToken: string | undefined) {
    if (!refreshToken) throw new UnauthorizedException("Missing refresh token.");
    let sub: string;
    let version: number;
    try {
      const payload = verify(refreshToken, requireJwtSecret(this.config), { algorithms: ["HS256"] });
      if (typeof payload === "string" || payload.kind !== "refresh" || typeof payload.sub !== "string" || typeof payload.version !== "number") throw new Error("invalid");
      sub = payload.sub;
      version = payload.version;
    } catch { throw new UnauthorizedException("Invalid refresh token."); }
    const user = await this.prisma.user.findUnique({ where: { id: sub } });
    if (!user || user.status !== PlatformUserStatus.ACTIVE || version !== user.tokenVersion) throw new UnauthorizedException("Invalid platform user.");
    return this.issueTokens(user);
  }

  async logout(userId: string) {
    await this.prisma.user.update({ where: { id: userId }, data: { tokenVersion: { increment: 1 } } });
    return { loggedOut: true };
  }

  private async issueTokens(user: { id: string; name: string; phone: string; role: PlatformRole; status: PlatformUserStatus }) {
    const secret = requireJwtSecret(this.config);
    const profile = await this.prisma.user.findUnique({ where: { id: user.id }, include: { carrier: true, district: true, kycProfile: true } });
    if (!profile) throw new UnauthorizedException("Invalid platform user.");
    const accessToken = sign({ platform: true, role: user.role, version: profile.tokenVersion }, secret, { algorithm: "HS256", expiresIn: "15m", subject: user.id });
    const refreshToken = sign({ kind: "refresh", platform: true, version: profile.tokenVersion }, secret, { algorithm: "HS256", expiresIn: "30d", subject: user.id });
    return { accessToken, refreshToken, user: { carrier: profile.carrier ? { companyName: profile.carrier.companyName, online: profile.carrier.online, vehicleReg: profile.carrier.vehicleReg } : null, district: profile.district.nameBn, id: profile.id, name: profile.name, phone: profile.phone, role: profile.role, status: profile.status, verified: profile.kycProfile?.status === "VERIFIED" } };
  }

  private assertPhone(phone: string) {
    if (!/^\+8801\d{9}$/.test(phone)) throw new BadRequestException("A valid Bangladesh phone number is required.");
  }

  private assertMobileRole(role: PlatformRole) {
    if (role !== PlatformRole.FARMER && role !== PlatformRole.BUYER && role !== PlatformRole.CARRIER) throw new BadRequestException("A mobile account role is required.");
  }

  private async registerDevice(userId: string, input: { deviceId?: string; platform?: string; pushToken?: string }) {
    if (!input.deviceId) return;
    await this.prisma.device.upsert({
      where: { id: input.deviceId },
      update: { lastSeenAt: new Date(), pushToken: input.pushToken },
      create: { id: input.deviceId, label: input.platform ?? "mobile", lastSeenAt: new Date(), pushToken: input.pushToken, userId },
    });
  }
}
