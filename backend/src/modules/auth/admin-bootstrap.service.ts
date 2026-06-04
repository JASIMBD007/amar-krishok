import { Injectable, Logger, OnApplicationBootstrap } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AccountStatus, Role } from "@prisma/client";
import { hash } from "bcryptjs";
import { PrismaService } from "../prisma/prisma.service";
import { getAdminLoginName, getAdminUsername } from "./admin-login-name";
import { normalizeUsername } from "./username";

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
    const username = normalizeUsername(getAdminUsername(this.config));

    if (!phone || !password) {
      return;
    }

    const passwordHash = await hash(password, 10);
    const existingAdmin = await this.prisma.user.findFirst({
      where: {
        OR: [{ username }, { phone, role: Role.ADMIN }],
      },
    });

    if (existingAdmin) {
      await this.prisma.user.update({
        data: {
          name,
          passwordHash,
          phone,
          status: AccountStatus.ACTIVE,
          username,
        },
        where: { id: existingAdmin.id },
      });
    } else {
      await this.prisma.user.create({
        data: {
          name,
          passwordHash,
          phone,
          role: Role.ADMIN,
          status: AccountStatus.ACTIVE,
          username,
        },
      });
    }

    this.logger.log("Admin account is ready from ADMIN_USERNAME.");
  }
}
