import { Injectable, Logger, OnApplicationBootstrap } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AccountStatus, Role } from "@prisma/client";
import { hash } from "bcryptjs";
import { PrismaService } from "../prisma/prisma.service";
import { getAdminLoginName } from "./admin-login-name";

@Injectable()
export class AdminBootstrapService implements OnApplicationBootstrap {
  private readonly logger = new Logger(AdminBootstrapService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async onApplicationBootstrap() {
    const phone = this.config.get<string>("ADMIN_PHONE")?.trim();
    const password = this.config.get<string>("ADMIN_PASSWORD")?.trim();
    const name = getAdminLoginName(this.config);

    if (!phone || !password) {
      return;
    }

    const passwordHash = await hash(password, 10);
    await this.prisma.user.upsert({
      create: {
        name,
        passwordHash,
        phone,
        role: Role.ADMIN,
        status: AccountStatus.ACTIVE,
      },
      update: {
        name,
        passwordHash,
        status: AccountStatus.ACTIVE,
      },
      where: { phone_role: { phone, role: Role.ADMIN } },
    });

    this.logger.log("Admin account is ready from ADMIN_PHONE.");
  }
}
