import { Injectable } from "@nestjs/common";
import { LotStatus, Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { CreateLotDto } from "./dto/create-lot.dto";

@Injectable()
export class LotsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(filters: { crop?: string; district?: string }) {
    return this.prisma.cropLot.findMany({
      include: {
        crop: true,
        district: true,
        farmer: true,
      },
      orderBy: { createdAt: "desc" },
      where: {
        crop: filters.crop ? { name: { contains: filters.crop, mode: "insensitive" } } : undefined,
        district: filters.district ? { name: filters.district } : undefined,
        status: LotStatus.ACTIVE,
      },
    });
  }

  async create(dto: CreateLotDto) {
    const [crop, district] = await Promise.all([
      this.prisma.crop.upsert({
        create: { name: dto.crop },
        update: { active: true },
        where: { name: dto.crop },
      }),
      this.prisma.district.upsert({
        create: { name: dto.district },
        update: { active: true },
        where: { name: dto.district },
      }),
    ]);

    return this.prisma.cropLot.create({
      data: {
        cropId: crop.id,
        districtId: district.id,
        farmerId: dto.farmerId,
        grade: dto.grade,
        harvestDate: dto.harvestDate ? new Date(dto.harvestDate) : undefined,
        imageUrl: dto.imageUrl,
        notes: dto.notes,
        pricePerKg: new Prisma.Decimal(dto.pricePerKg),
        quantityKg: new Prisma.Decimal(dto.quantityKg),
        status: LotStatus.ACTIVE,
      },
      include: {
        crop: true,
        district: true,
        farmer: true,
      },
    });
  }
}
