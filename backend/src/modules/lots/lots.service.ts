import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { LotStatus, Prisma, Role } from "@prisma/client";
import { AuthenticatedUser } from "../auth/types/authenticated-user";
import { NotificationsService } from "../notifications/notifications.service";
import { PrismaService } from "../prisma/prisma.service";
import { CreateLotDto, UpdateLotDto } from "./dto/create-lot.dto";

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
      phone: true,
      reviewedAt: true,
      role: true,
      status: true,
      upazilla: true,
      updatedAt: true,
      username: true,
    },
  },
} satisfies Prisma.CropLotInclude;

@Injectable()
export class LotsService {
  constructor(
    private readonly notifications: NotificationsService,
    private readonly prisma: PrismaService,
  ) {}

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

    const status = user.role === Role.ADMIN ? LotStatus.ACTIVE : LotStatus.DRAFT;
    const lot = await this.prisma.cropLot.create({
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
        status,
        upazilla: dto.upazilla,
      },
      include: lotInclude,
    });

    await this.notifications.notifyAdmins({
      body: `${lot.farmer.name} · ${lot.crop.name} · ${lot.upazilla || lot.district.name}`,
      title: "New supply lot posted",
    });
    await this.notifications.notifyUser(lot.farmerId, {
      body:
        status === LotStatus.ACTIVE
          ? `${lot.crop.name} · ${lot.upazilla || lot.district.name} · ${lot.quantityKg} kg listed at ৳${lot.pricePerKg}/kg`
          : `${lot.crop.name} · ${lot.upazilla || lot.district.name} submitted for admin approval.`,
      title: status === LotStatus.ACTIVE ? "Crop lot published" : "Crop lot submitted",
    });

    return lot;
  }

  async update(id: string, dto: UpdateLotDto, user: AuthenticatedUser) {
    const existingLot = await this.findEditableLot(id, user);
    const data: Prisma.CropLotUpdateInput = {};

    if (dto.crop !== undefined) {
      const cropName = dto.crop.trim();
      if (!cropName) {
        throw new BadRequestException("Crop name is required.");
      }

      const crop = await this.prisma.crop.upsert({
        create: { name: cropName },
        update: { active: true },
        where: { name: cropName },
      });
      data.crop = { connect: { id: crop.id } };
    }

    if (dto.district !== undefined) {
      const districtName = dto.district.trim();
      if (!districtName) {
        throw new BadRequestException("District is required.");
      }

      const district = await this.prisma.district.upsert({
        create: { name: districtName },
        update: { active: true },
        where: { name: districtName },
      });
      data.district = { connect: { id: district.id } };
    }

    if (dto.upazilla !== undefined) {
      data.upazilla = dto.upazilla.trim();
    }

    if (dto.quantityKg !== undefined) {
      data.quantityKg = new Prisma.Decimal(dto.quantityKg);
    }

    if (dto.pricePerKg !== undefined) {
      data.pricePerKg = new Prisma.Decimal(dto.pricePerKg);
    }

    if (dto.grade !== undefined) {
      data.grade = dto.grade;
    }

    if (dto.harvestDate !== undefined) {
      data.harvestDate = dto.harvestDate ? new Date(dto.harvestDate) : null;
    }

    if (dto.notes !== undefined) {
      data.notes = dto.notes.trim() || null;
    }

    if (dto.imageUrl !== undefined) {
      data.imageUrl = dto.imageUrl.trim() || null;
    }

    const lot = await this.prisma.cropLot.update({
      data,
      include: lotInclude,
      where: { id: existingLot.id },
    });

    await this.notifications.notifyUser(lot.farmerId, {
      body: `${lot.crop.name} · ${lot.upazilla || lot.district.name} details were updated.`,
      title: "Lot details updated",
    });

    return lot;
  }

  async setStatus(id: string, status: LotStatus, user: AuthenticatedUser) {
    const existingLot = await this.findEditableLot(id, user);
    const nextStatus = user.role === Role.FARMER && status === LotStatus.ACTIVE ? LotStatus.DRAFT : status;
    const lot = await this.prisma.cropLot.update({
      data: { status: nextStatus },
      include: lotInclude,
      where: { id: existingLot.id },
    });

    await this.notifications.markSupplyLotNotificationsReviewed(lot);
    await this.notifications.notifyUser(lot.farmerId, {
      body:
        nextStatus === LotStatus.ACTIVE
          ? `${lot.crop.name} is active and visible in the marketplace.`
          : nextStatus === LotStatus.DRAFT
            ? `${lot.crop.name} was sent for admin review.`
            : `${lot.crop.name} is inactive and hidden from the marketplace.`,
      title: "Lot status update",
    });

    if (user.role === Role.FARMER && nextStatus === LotStatus.DRAFT) {
      await this.notifications.notifyAdmins({
        body: `${lot.farmer.name} · ${lot.crop.name} · ${lot.upazilla || lot.district.name}`,
        title: "Supply lot needs review",
      });
    }

    return lot;
  }

  async review(id: string, action: "approve" | "reject") {
    const existingLot = await this.prisma.cropLot.findUnique({
      include: lotInclude,
      where: { id },
    });

    if (!existingLot) {
      throw new NotFoundException("Crop lot not found.");
    }

    const nextStatus = action === "approve" ? LotStatus.ACTIVE : LotStatus.CANCELLED;
    const lot = await this.prisma.cropLot.update({
      data: { status: nextStatus },
      include: lotInclude,
      where: { id },
    });

    await this.notifications.markSupplyLotNotificationsReviewed(lot);
    await this.notifications.notifyUser(lot.farmerId, {
      body:
        action === "approve"
          ? `${lot.crop.name} is approved and now visible in the marketplace.`
          : `${lot.crop.name} was reviewed and is not visible in the marketplace.`,
      title: "Lot status update",
    });

    return lot;
  }

  private async findEditableLot(id: string, user: AuthenticatedUser) {
    const existingLot = await this.prisma.cropLot.findUnique({
      include: lotInclude,
      where: { id },
    });

    if (!existingLot) {
      throw new NotFoundException("Crop lot not found.");
    }

    if (user.role !== Role.ADMIN && existingLot.farmerId !== user.id) {
      throw new ForbiddenException("You can only manage your own crop lots.");
    }

    return existingLot;
  }
}
