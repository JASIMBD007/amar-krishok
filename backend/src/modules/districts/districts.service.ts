import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateDistrictDto } from "./dto/create-district.dto";

@Injectable()
export class DistrictsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.district.findMany({
      orderBy: { name: "asc" },
      where: { active: true },
    });
  }

  create(dto: CreateDistrictDto) {
    return this.prisma.district.upsert({
      create: { active: dto.active ?? true, name: dto.name },
      update: { active: dto.active ?? true },
      where: { name: dto.name },
    });
  }
}
