import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { CreateMarketPriceDto } from "./dto/create-market-price.dto";

@Injectable()
export class MarketPricesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(filters: { crop?: string; district?: string }) {
    return this.prisma.marketPrice.findMany({
      include: { crop: true, district: true },
      orderBy: { priceDate: "desc" },
      where: {
        crop: filters.crop ? { name: { contains: filters.crop, mode: "insensitive" } } : undefined,
        district: filters.district ? { name: filters.district } : undefined,
      },
    });
  }

  async create(dto: CreateMarketPriceDto) {
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
    const priceDate = new Date(dto.priceDate);

    return this.prisma.marketPrice.upsert({
      create: {
        cropId: crop.id,
        districtId: district.id,
        farmerAsk: new Prisma.Decimal(dto.farmerAsk),
        priceDate,
        retail: new Prisma.Decimal(dto.retail),
        source: dto.source,
        wholesale: new Prisma.Decimal(dto.wholesale),
      },
      update: {
        farmerAsk: new Prisma.Decimal(dto.farmerAsk),
        retail: new Prisma.Decimal(dto.retail),
        source: dto.source,
        wholesale: new Prisma.Decimal(dto.wholesale),
      },
      where: {
        cropId_districtId_priceDate: {
          cropId: crop.id,
          districtId: district.id,
          priceDate,
        },
      },
    });
  }
}
