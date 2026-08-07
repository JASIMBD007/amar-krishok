import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { LotStatus, OfferStatus, Prisma, Role } from "@prisma/client";
import { AuthenticatedUser } from "../auth/types/authenticated-user";
import { NotificationsService } from "../notifications/notifications.service";
import { PrismaService } from "../prisma/prisma.service";
import { CreateLotOfferDto } from "./dto/lot-offer.dto";

const offerInclude = {
  buyer: { select: { id: true, name: true, organization: true } },
  cropLot: {
    select: {
      crop: { select: { name: true } },
      district: { select: { name: true } },
      farmerId: true,
      grade: true,
      id: true,
      pricePerKg: true,
      quantityKg: true,
      status: true,
    },
  },
} satisfies Prisma.LotOfferInclude;

@Injectable()
export class OffersService {
  constructor(
    private readonly notifications: NotificationsService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * A buyer sees the offers they sent, a farmer sees the offers waiting on their own lots, and
   * staff see the whole book.
   */
  findAll(user: AuthenticatedUser) {
    if (user.role === Role.BUYER) {
      return this.prisma.lotOffer.findMany({
        include: offerInclude,
        orderBy: { createdAt: "desc" },
        where: { buyerId: user.id },
      });
    }

    if (user.role === Role.FARMER) {
      return this.prisma.lotOffer.findMany({
        include: offerInclude,
        orderBy: { createdAt: "desc" },
        where: { cropLot: { farmerId: user.id } },
      });
    }

    return this.prisma.lotOffer.findMany({
      include: offerInclude,
      orderBy: { createdAt: "desc" },
    });
  }

  async create(dto: CreateLotOfferDto, user: AuthenticatedUser) {
    const lot = await this.prisma.cropLot.findUnique({
      include: { crop: true, district: true, farmer: { select: { id: true, name: true } } },
      where: { id: dto.cropLotId },
    });

    if (!lot) {
      throw new NotFoundException("Crop lot not found.");
    }

    if (lot.status !== LotStatus.ACTIVE) {
      throw new BadRequestException("This lot is not open for offers.");
    }

    if (lot.farmerId === user.id) {
      throw new BadRequestException("You cannot make an offer on your own lot.");
    }

    // One open offer per buyer per lot: a new offer replaces the buyer's previous one rather than
    // stacking up a queue the farmer has to work through.
    await this.prisma.lotOffer.updateMany({
      data: { respondedAt: new Date(), status: OfferStatus.DECLINED },
      where: { buyerId: user.id, cropLotId: lot.id, status: OfferStatus.OPEN },
    });

    const offer = await this.prisma.lotOffer.create({
      data: {
        buyerId: user.id,
        cropLotId: lot.id,
        note: dto.note?.trim() || null,
        pricePerKg: new Prisma.Decimal(dto.pricePerKg),
        status: OfferStatus.OPEN,
      },
      include: offerInclude,
    });

    await this.notifications.notifyUser(lot.farmerId, {
      body: `${offer.buyer.name} offered ৳${offer.pricePerKg}/kg for ${lot.crop.name} · Grade ${lot.grade}. Your ask is ৳${lot.pricePerKg}/kg.`,
      title: "New offer on your lot",
    });
    await this.notifications.notifyUser(user.id, {
      body: `${lot.crop.name} · Grade ${lot.grade} · ${lot.district.name}. The farmer has 24 hours to reply — no money moves yet.`,
      title: "Offer sent",
    });

    return offer;
  }

  async respond(id: string, action: "accept" | "decline", user: AuthenticatedUser) {
    const existing = await this.prisma.lotOffer.findUnique({
      include: offerInclude,
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException("Offer not found.");
    }

    if (user.role !== Role.ADMIN && existing.cropLot.farmerId !== user.id) {
      throw new ForbiddenException("You can only answer offers on your own lots.");
    }

    if (existing.status !== OfferStatus.OPEN) {
      throw new BadRequestException("This offer has already been answered.");
    }

    const offer = await this.prisma.lotOffer.update({
      data: {
        respondedAt: new Date(),
        status: action === "accept" ? OfferStatus.ACCEPTED : OfferStatus.DECLINED,
      },
      include: offerInclude,
      where: { id },
    });

    await this.notifications.notifyUser(offer.buyerId, {
      body:
        action === "accept"
          ? `Your offer of ৳${offer.pricePerKg}/kg for ${offer.cropLot.crop.name} was accepted. Order now to move the money into escrow.`
          : `Your offer of ৳${offer.pricePerKg}/kg for ${offer.cropLot.crop.name} was declined. You can still order at the asking price.`,
      title: action === "accept" ? "Offer accepted" : "Offer declined",
    });

    await this.prisma.legacyAuditLog.create({
      data: {
        action: action === "accept" ? "offer.accept" : "offer.decline",
        actorId: user.id,
        metadata: {
          buyer: offer.buyer.name,
          cropLotId: offer.cropLotId,
          pricePerKg: offer.pricePerKg.toString(),
        },
        target: `LotOffer:${offer.id}`,
      },
    });

    return offer;
  }
}
