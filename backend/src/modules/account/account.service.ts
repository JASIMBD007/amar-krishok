import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { districtCreateData } from "../../common/catalogue-data";
import { AuthenticatedUser } from "../auth/types/authenticated-user";
import { PrismaService } from "../prisma/prisma.service";
import { UpdateProfileDto } from "./dto/update-profile.dto";

const profileSelect = {
  address: true,
  createdAt: true,
  district: { select: { name: true } },
  focus: true,
  id: true,
  identity: true,
  name: true,
  organization: true,
  phone: true,
  reviewedAt: true,
  role: true,
  status: true,
  upazilla: true,
  updatedAt: true,
  username: true,
} satisfies Prisma.LegacyUserSelect;

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
      focus: dto.focus?.trim(),
      identity: dto.identity?.trim(),
      name: dto.name?.trim(),
      organization: dto.organization?.trim(),
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
}
