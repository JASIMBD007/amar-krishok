import { BadRequestException, UnauthorizedException } from "@nestjs/common";
import type { ConfigService } from "@nestjs/config";
import { AccountStatus, PlatformRole, PlatformUserStatus, Role } from "@prisma/client";
import { hash } from "bcryptjs";
import { equal, rejects } from "node:assert/strict";
import { test } from "node:test";
import { verify } from "jsonwebtoken";

import { AuthService } from "../auth/auth.service";
import type { NotificationsService } from "../notifications/notifications.service";
import type { PrismaService } from "../prisma/prisma.service";
import { MobileAuthService } from "./mobile-auth.service";

function service(prisma: object = {}) {
  return new MobileAuthService(
    { get: () => "test-secret-with-enough-entropy" } as unknown as ConfigService,
    {} as NotificationsService,
    prisma as PrismaService,
  );
}

test("carrier registration is staff-provisioned and cannot self-register", async () => {
  await rejects(
    service().register({ address: "", district: "", focus: "", identity: "", name: "", organization: "", password: "", phone: "", role: PlatformRole.CARRIER, upazila: "" }),
    BadRequestException,
  );
});

test("website credentials cannot log in before admin approval", async () => {
  const passwordHash = await hash("safe-password", 4);
  const auth = service({
    legacyUser: { findUnique: async () => ({ district: null, passwordHash, status: AccountStatus.PENDING }) },
  });
  await rejects(
    auth.loginWithPassword({ password: "safe-password", phone: "+8801711000000", role: PlatformRole.BUYER }),
    UnauthorizedException,
  );
});

test("the website login endpoint returns a platform session to the mobile client", async () => {
  const secret = "test-secret-with-enough-entropy-for-jwt-signing";
  const passwordHash = await hash("safe-password", 4);
  const platformAccount = {
    district: { id: "district-1", nameBn: "বগুড়া" },
    id: "platform-user-1",
    kycProfile: null,
    name: "রহিম উদ্দিন",
    phone: "+8801711000000",
    role: PlatformRole.FARMER,
    status: PlatformUserStatus.ACTIVE,
    tokenVersion: 0,
  };
  const prisma = {
    device: { upsert: async () => ({}) },
    district: { findUnique: async () => platformAccount.district },
    legacyUser: {
      findUnique: async () => ({
        address: "শিবগঞ্জ",
        districtId: "district-1",
        focus: "আলু",
        id: "legacy-user-1",
        identity: "NID-1",
        name: platformAccount.name,
        organization: "রহিম কৃষি খামার",
        passwordHash,
        phone: "01711000000",
        role: Role.FARMER,
        status: AccountStatus.ACTIVE,
        upazilla: "শিবগঞ্জ",
      }),
    },
    user: { findUnique: async () => null, upsert: async () => platformAccount },
  };
  const auth = new AuthService(
    { get: () => secret } as unknown as ConfigService,
    {} as NotificationsService,
    prisma as unknown as PrismaService,
  );
  const result = await auth.login({ client: "mobile", deviceId: "ios-test", password: "safe-password", phone: "01711000000", role: Role.FARMER });
  equal("refreshToken" in result, true);
  const payload = verify(result.accessToken, secret);
  equal(typeof payload === "string" ? undefined : payload.platform, true);
  equal(result.user.role, PlatformRole.FARMER);
});

test("a website account cannot be opened under a different mobile role", async () => {
  const auth = service({
    legacyUser: { findUnique: async () => null },
    user: { findUnique: async () => ({ passwordHash: "unused", role: PlatformRole.FARMER }) },
  });
  await rejects(
    auth.loginWithPassword({ password: "safe-password", phone: "+8801711000000", role: PlatformRole.BUYER }),
    UnauthorizedException,
  );
});
