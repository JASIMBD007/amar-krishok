import { BadRequestException, Injectable } from "@nestjs/common";
import { LotStatus, Prisma, Role } from "@prisma/client";
import { AuthenticatedUser } from "../auth/types/authenticated-user";
import { PrismaService } from "../prisma/prisma.service";
import { CreateLotDto } from "./dto/create-lot.dto";

const lotInclude = {
  crop: true,
  district: true,
  farmer: {
    select: {
      createdAt: true,
      focus: true,
      id: true,
      name: true,
      organization: true,
      reviewedAt: true,
      role: true,
      status: true,
      updatedAt: true,
    },
  },
} satisfies Prisma.CropLotInclude;

@Injectable()
export class LotsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(filters: { crop?: string; district?: string }) {
    return this.prisma.cropLot.findMany({
      include: lotInclude,
      orderBy: { createdAt: "desc" },
      where: {
        crop: filters.crop ? { name: { contains: filters.crop, mode: "insensitive" } } : undefined,
        district: filters.district ? { name: filters.district } : undefined,
        status: LotStatus.ACTIVE,
      },
    });
  }

  async findMine(user: AuthenticatedUser) {
    return this.prisma.cropLot.findMany({
      include: lotInclude,
      orderBy: { createdAt: "desc" },
      where: user.role === Role.FARMER ? { farmerId: user.id } : undefined,
    });
  }

  async create(dto: CreateLotDto, user: AuthenticatedUser) {
    const farmerId = user.role === Role.FARMER ? user.id : dto.farmerId;
    if (!farmerId) {
      throw new BadRequestException("farmerId is required when an admin creates a lot.");
    }

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
        farmerId,
        grade: dto.grade,
        harvestDate: dto.harvestDate ? new Date(dto.harvestDate) : undefined,
        imageUrl: dto.imageUrl,
        notes: dto.notes,
        pricePerKg: new Prisma.Decimal(dto.pricePerKg),
        quantityKg: new Prisma.Decimal(dto.quantityKg),
        status: LotStatus.ACTIVE,
      },
      include: lotInclude,
    });
  }
}
