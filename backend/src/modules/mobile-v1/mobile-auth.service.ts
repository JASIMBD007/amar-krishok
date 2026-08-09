import { BadRequestException, ForbiddenException, Injectable, ServiceUnavailableException, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PlatformRole, PlatformUserStatus } from "@prisma/client";
import { compare, hash } from "bcryptjs";
import { sign, verify } from "jsonwebtoken";

import { requireJwtSecret } from "../auth/jwt-secret";
import { PrismaService } from "../prisma/prisma.service";

type OtpRecord = { code: string; expiresAt: number; role: PlatformRole };

@Injectable()
export class MobileAuthService {
  private readonly otp = new Map<string, OtpRecord>();

  constructor(private readonly config: ConfigService, private readonly prisma: PrismaService) {}

  requestOtp(phone: string, role: PlatformRole) {
    this.assertPhone(phone);
    this.assertMobileRole(role);
    if (this.config.get("NODE_ENV") === "production" && !this.config.get("SMS_OTP_PROVIDER")) {
      throw new ServiceUnavailableException({ error: { code: "OTP_PROVIDER_UNAVAILABLE", message: "OTP delivery is temporarily unavailable.", messageBn: "OTP পাঠানোর সেবা সাময়িকভাবে বন্ধ আছে।" } });
    }
    const code = this.config.get("NODE_ENV") === "production" ? String(Math.floor(1000 + Math.random() * 9000)) : "1234";
    this.otp.set(phone, { code, expiresAt: Date.now() + 5 * 60_000, role });
    return { expiresInSeconds: 300, resendAfterSeconds: 42 };
  }

  async verifyOtp(input: { deviceId?: string; otp: string; phone: string; pin: string; platform?: string; pushToken?: string; role: PlatformRole }) {
    this.assertPhone(input.phone);
    this.assertMobileRole(input.role);
    if (!/^\d{4}$/.test(input.pin)) throw new BadRequestException("PIN must contain four digits.");
    const record = this.otp.get(input.phone);
    if (!record || record.expiresAt < Date.now() || record.code !== input.otp || record.role !== input.role) {
      throw new UnauthorizedException({ error: { code: "OTP_INVALID", message: "The OTP is invalid or expired.", messageBn: "OTP সঠিক নয় অথবা মেয়াদ শেষ হয়েছে।" } });
    }
    this.otp.delete(input.phone);
    const existing = await this.prisma.user.findUnique({ where: { phone: input.phone } });
    if (existing && existing.role !== input.role) {
      throw new ForbiddenException({ error: { code: "ROLE_LOCKED", message: "The account role can only be changed by support.", messageBn: "অ্যাকাউন্টের ভূমিকা শুধু সহায়তা দল পরিবর্তন করতে পারে।" } });
    }
    const district = await this.prisma.district.findFirst({ where: { active: true }, orderBy: { nameEn: "asc" } });
    if (!district) throw new ServiceUnavailableException("No active district is configured.");
    const pinHash = await hash(input.pin, 12);
    const user = existing ?? await this.prisma.user.create({ data: { districtId: district.id, name: input.role === PlatformRole.CARRIER ? "নতুন পরিবহন অংশীদার" : input.role === PlatformRole.BUYER ? "নতুন ক্রেতা" : "নতুন কৃষক", phone: input.phone, pinHash, role: input.role, status: PlatformUserStatus.ACTIVE, upazila: district.nameBn } });
    if (existing) await this.prisma.user.update({ where: { id: existing.id }, data: { pinHash } });
    if (input.role === PlatformRole.CARRIER) {
      await this.prisma.carrier.upsert({ where: { userId: user.id }, update: {}, create: { capacityMon: 1, companyName: user.name, districts: { connect: { id: district.id } }, userId: user.id, vehicleReg: `PENDING-${user.id}` } });
    }
    if (input.deviceId) {
      await this.prisma.device.upsert({ where: { id: input.deviceId }, update: { lastSeenAt: new Date(), pushToken: input.pushToken }, create: { id: input.deviceId, label: input.platform ?? "mobile", lastSeenAt: new Date(), pushToken: input.pushToken, userId: user.id } });
    }
    return this.issueTokens(user);
  }

  async loginWithPin(phone: string, pin: string) {
    const user = await this.prisma.user.findUnique({ where: { phone } });
    if (!user || !(await compare(pin, user.pinHash))) throw new UnauthorizedException("Invalid phone or PIN.");
    return this.issueTokens(user);
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
    if (!user || user.status === PlatformUserStatus.RESTRICTED || version !== user.tokenVersion) throw new UnauthorizedException("Invalid platform user.");
    return this.issueTokens(user);
  }

  async logout(userId: string) {
    await this.prisma.user.update({ where: { id: userId }, data: { tokenVersion: { increment: 1 } } });
    return { loggedOut: true };
  }

  private async issueTokens(user: { id: string; name: string; phone: string; role: PlatformRole; status: PlatformUserStatus }) {
    const secret = requireJwtSecret(this.config);
    const profile = await this.prisma.user.findUnique({ where: { id: user.id }, include: { district: true, kycProfile: true } });
    if (!profile) throw new UnauthorizedException("Invalid platform user.");
    const accessToken = sign({ platform: true, role: user.role, version: profile.tokenVersion }, secret, { algorithm: "HS256", expiresIn: "15m", subject: user.id });
    const refreshToken = sign({ kind: "refresh", platform: true, version: profile.tokenVersion }, secret, { algorithm: "HS256", expiresIn: "30d", subject: user.id });
    return { accessToken, refreshToken, user: { district: profile.district.nameBn, id: profile.id, name: profile.name, phone: profile.phone, role: profile.role, status: profile.status, verified: profile.kycProfile?.status === "VERIFIED" } };
  }

  private assertPhone(phone: string) {
    if (!/^\+8801\d{9}$/.test(phone)) throw new BadRequestException("A valid Bangladesh phone number is required.");
  }

  private assertMobileRole(role: PlatformRole) {
    if (role !== PlatformRole.FARMER && role !== PlatformRole.BUYER && role !== PlatformRole.CARRIER) throw new BadRequestException("A mobile account role is required.");
  }
}
