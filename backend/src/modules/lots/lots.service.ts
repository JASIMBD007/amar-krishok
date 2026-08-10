import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { LotStatus, Prisma, Role } from "@prisma/client";
import { cropCreateData, districtCreateData } from "../../common/catalogue-data";
import { AuthenticatedUser } from "../auth/types/authenticated-user";
import { NotificationsService } from "../notifications/notifications.service";
import { PrismaService } from "../prisma/prisma.service";
import { CreateLotDto, UpdateLotDto } from "./dto/create-lot.dto";
import { UpdateLotPhotoDto } from "./dto/lot-photo.dto";

const lotInclude = {
  crop: true,
  district: true,
  photos: { orderBy: { sortOrder: "asc" } },
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

// The public marketplace listing is reachable without authentication, so it must not expose the
// farmer's phone number or account username to anonymous visitors/scrapers.
const publicLotInclude = {
  crop: true,
  district: true,
  photos: { orderBy: { sortOrder: "asc" } },
  farmer: {
    select: {
      createdAt: true,
      focus: true,
      id: true,
      name: true,
      organization: true,
      // The verified-farm badge is part of the trust model, so account status is public. It is not
      // PII, unlike the phone number and username deliberately left out above.
      status: true,
      upazilla: true,
    },
  },
} satisfies Prisma.CropLotInclude;

type IncludedLot = Prisma.CropLotGetPayload<{ include: typeof lotInclude }>;

function formatLotLocation(lot: Pick<IncludedLot, "district" | "upazilla">) {
  return lot.upazilla ? `${lot.upazilla}, ${lot.district.name}` : lot.district.name;
}

function formatLotStatus(status: LotStatus) {
  const labels: Partial<Record<LotStatus, string>> = {
    [LotStatus.ACTIVE]: "Active",
    [LotStatus.CANCELLED]: "Inactive",
    [LotStatus.DRAFT]: "Draft",
    [LotStatus.RESERVED]: "Reserved",
    [LotStatus.SOLD]: "Sold",
  };
  return labels[status] ?? status;
}

function formatOptionalDate(value: Date | string | null | undefined) {
  if (!value) {
    return "Not added";
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Not added";
  }

  return date.toISOString().slice(0, 10);
}

function formatValue(value: { toString(): string } | string | number | null | undefined) {
  if (value === null || value === undefined) {
    return "Not added";
  }

  const formatted = value.toString().trim();
  return formatted || "Not added";
}

function buildLotChangeList(before: IncludedLot, after: IncludedLot) {
  const changes: string[] = [];
  const addChange = (label: string, beforeValue: string, afterValue: string) => {
    if (beforeValue !== afterValue) {
      changes.push(`${label}: ${beforeValue} -> ${afterValue}`);
    }
  };

  addChange("Crop", before.crop.name, after.crop.name);
  addChange("Location", formatLotLocation(before), formatLotLocation(after));
  addChange("Quantity", `${formatValue(before.quantityKg)} kg`, `${formatValue(after.quantityKg)} kg`);
  addChange("Price", `৳${formatValue(before.pricePerKg)}/kg`, `৳${formatValue(after.pricePerKg)}/kg`);
  addChange("Grade", before.grade, after.grade);
  addChange("Status", formatLotStatus(before.status), formatLotStatus(after.status));
  addChange("Harvest date", formatOptionalDate(before.harvestDate), formatOptionalDate(after.harvestDate));
  addChange("Notes", formatValue(before.notes), formatValue(after.notes));
  addChange("Crop image", before.imageUrl ? "Uploaded" : "Not added", after.imageUrl ? "Uploaded" : "Not added");
  addChange("Transport included", before.transportIncluded ? "Yes" : "No", after.transportIncluded ? "Yes" : "No");
  addChange("Pickup within 24 h", before.pickupWithin24h ? "Yes" : "No", after.pickupWithin24h ? "Yes" : "No");

  return changes.length > 0 ? changes : ["No visible field changed"];
}

function buildLotAuditBody(lot: IncludedLot, changes: string[]) {
  return [
    `Farmer: ${lot.farmer.name}`,
    `Mobile: ${formatValue(lot.farmer.phone)}`,
    `Crop: ${lot.crop.name}`,
    `Location: ${formatLotLocation(lot)}`,
    `Quantity: ${formatValue(lot.quantityKg)} kg`,
    `Price: ৳${formatValue(lot.pricePerKg)}/kg`,
    `Grade: ${lot.grade}`,
    `Transport included: ${lot.transportIncluded ? "Yes" : "No"}`,
    `Pickup within 24 h: ${lot.pickupWithin24h ? "Yes" : "No"}`,
    `Status: ${formatLotStatus(lot.status)}`,
    `Changes: ${changes.join("; ")}`,
  ].join("\n");
}

@Injectable()
export class LotsService {
  constructor(
    private readonly notifications: NotificationsService,
    private readonly prisma: PrismaService,
  ) {}

  async findAll(filters: { crop?: string; district?: string }) {
    return this.prisma.cropLot.findMany({
      include: publicLotInclude,
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
        create: cropCreateData(dto.crop),
        update: { active: true },
        where: { name: dto.crop },
      }),
      this.prisma.district.upsert({
        create: districtCreateData(dto.district),
        update: { active: true },
        where: { name: dto.district },
      }),
    ]);

    const lot = await this.prisma.cropLot.create({
      data: {
        cropId: crop.id,
        districtId: district.id,
        farmerId,
        grade: dto.grade,
        harvestDate: dto.harvestDate ? new Date(dto.harvestDate) : undefined,
        imageUrl: dto.imageUrl,
        notes: dto.notes,
        pickupWithin24h: dto.pickupWithin24h ?? false,
        pricePerKg: new Prisma.Decimal(dto.pricePerKg),
        quantityKg: new Prisma.Decimal(dto.quantityKg),
        status: LotStatus.ACTIVE,
        transportIncluded: dto.transportIncluded ?? false,
        upazilla: dto.upazilla,
      },
      include: lotInclude,
    });

    await this.notifications.notifyAdmins({
      body: `${lot.farmer.name} · ${lot.crop.name} · ${lot.upazilla || lot.district.name}`,
      title: "New supply lot posted",
    });
    await this.notifications.notifyUser(lot.farmerId, {
      body: `${lot.crop.name} · ${formatLotLocation(lot)} · ${lot.quantityKg} kg listed at ৳${lot.pricePerKg}/kg`,
      title: "Crop lot published",
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
        create: cropCreateData(cropName),
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
        create: districtCreateData(districtName),
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

    if (dto.transportIncluded !== undefined) {
      data.transportIncluded = dto.transportIncluded;
    }

    if (dto.pickupWithin24h !== undefined) {
      data.pickupWithin24h = dto.pickupWithin24h;
    }

    if (existingLot.status === LotStatus.DRAFT) {
      data.status = LotStatus.ACTIVE;
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

    if (user.role === Role.FARMER) {
      await this.notifications.notifyAdmins({
        body: buildLotAuditBody(lot, buildLotChangeList(existingLot, lot)),
        title: "Farmer lot updated",
      });
    }

    return lot;
  }

  async setStatus(id: string, status: LotStatus, user: AuthenticatedUser) {
    if (status === LotStatus.DRAFT) {
      throw new BadRequestException("Crop lots can only be active or inactive.");
    }

    const existingLot = await this.findEditableLot(id, user);
    const nextStatus = status === LotStatus.CANCELLED ? LotStatus.CANCELLED : LotStatus.ACTIVE;
    const statusChanged = existingLot.status !== nextStatus;
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
          : `${lot.crop.name} is inactive and hidden from the marketplace.`,
      title: "Lot status update",
    });

    if (user.role === Role.FARMER && statusChanged) {
      await this.notifications.notifyAdmins({
        body: buildLotAuditBody(lot, [`Status: ${formatLotStatus(existingLot.status)} -> ${formatLotStatus(nextStatus)}`]),
        title: "Farmer lot status changed",
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

  /** Photos belong to the farmer who owns the lot; staff may also manage them. */
  async addPhoto(lotId: string, url: string, caption: string | undefined, user: AuthenticatedUser) {
    const lot = await this.findEditableLot(lotId, user);
    const count = await this.prisma.cropLotPhoto.count({ where: { cropLotId: lot.id } });

    if (count >= 6) {
      throw new BadRequestException("A listing can carry six photos at most.");
    }

    await this.prisma.cropLotPhoto.create({
      data: {
        caption: caption?.trim() || null,
        cropLotId: lot.id,
        // The first photo on a lot becomes its cover, so a listing always has one.
        isCover: count === 0,
        sortOrder: count,
        url,
      },
    });

    return this.prisma.cropLot.findUnique({ include: lotInclude, where: { id: lot.id } });
  }

  async updatePhoto(lotId: string, photoId: string, dto: UpdateLotPhotoDto, user: AuthenticatedUser) {
    const lot = await this.findEditableLot(lotId, user);
    const photo = await this.prisma.cropLotPhoto.findUnique({ where: { id: photoId } });

    if (!photo || photo.cropLotId !== lot.id) {
      throw new NotFoundException("Photo not found on this listing.");
    }

    await this.prisma.$transaction(async (tx) => {
      if (dto.isCover) {
        // Exactly one cover per lot.
        await tx.cropLotPhoto.updateMany({ data: { isCover: false }, where: { cropLotId: lot.id } });
      }

      await tx.cropLotPhoto.update({
        data: {
          caption: dto.caption === undefined ? undefined : dto.caption.trim() || null,
          isCover: dto.isCover ?? undefined,
          sortOrder: dto.sortOrder ?? undefined,
        },
        where: { id: photoId },
      });
    });

    return this.prisma.cropLot.findUnique({ include: lotInclude, where: { id: lot.id } });
  }

  async removePhoto(lotId: string, photoId: string, user: AuthenticatedUser) {
    const lot = await this.findEditableLot(lotId, user);
    const photo = await this.prisma.cropLotPhoto.findUnique({ where: { id: photoId } });

    if (!photo || photo.cropLotId !== lot.id) {
      throw new NotFoundException("Photo not found on this listing.");
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.cropLotPhoto.delete({ where: { id: photoId } });
      const remaining = await tx.cropLotPhoto.findMany({
        orderBy: { sortOrder: "asc" },
        where: { cropLotId: lot.id },
      });

      // Close the gap in the ordering, and hand the cover on if it was the one removed.
      for (const [index, item] of remaining.entries()) {
        await tx.cropLotPhoto.update({
          data: { isCover: photo.isCover ? index === 0 : item.isCover, sortOrder: index },
          where: { id: item.id },
        });
      }
    });

    return this.prisma.cropLot.findUnique({ include: lotInclude, where: { id: lot.id } });
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
