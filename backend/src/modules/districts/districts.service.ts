import { Injectable } from "@nestjs/common";
import { districtCreateData } from "../../common/catalogue-data";
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
      create: { ...districtCreateData(dto.name), active: dto.active ?? true },
      update: { active: dto.active ?? true },
      where: { name: dto.name },
    });
  }
}
