import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { AuthenticatedUser } from "../auth/types/authenticated-user";
import { NotificationsService } from "../notifications/notifications.service";
import { PrismaService } from "../prisma/prisma.service";
import { CreateReviewDto } from "./dto/review.dto";
import { farmerReputations } from "./farmer-reputation";
import { REFUSAL_MESSAGES, farmersOnOrder, reviewRefusal } from "./review-eligibility";

/** A review is public, so it carries the author's name and nothing else about them. */
const publicReviewSelect = {
  author: { select: { name: true } },
  comment: true,
  createdAt: true,
  id: true,
  orderId: true,
  rating: true,
  revieweeId: true,
} satisfies Prisma.ReviewSelect;

const orderForReviewInclude = {
  items: { select: { cropLot: { select: { farmerId: true } } } },
} satisfies Prisma.LegacyOrderInclude;

@Injectable()
export class ReviewsService {
  constructor(
    private readonly notifications: NotificationsService,
    private readonly prisma: PrismaService,
  ) {}

  /** Hidden reviews never leave the server, so the public list and the average always agree. */
  async findForFarmer(farmerId: string) {
    const [reviews, reputations] = await Promise.all([
      this.prisma.review.findMany({
        orderBy: { createdAt: "desc" },
        select: publicReviewSelect,
        where: { hiddenAt: null, revieweeId: farmerId },
      }),
      farmerReputations(this.prisma, [farmerId]),
    ]);

    return { reputation: reputations.get(farmerId) ?? null, reviews };
  }

  /**
   * The farmers on an order the caller could still rate. The UI asks for this rather than deriving
   * it, so the button a buyer sees and the rule the server enforces cannot drift apart.
   */
  async findReviewable(orderId: string, user: AuthenticatedUser) {
    const order = await this.prisma.legacyOrder.findUnique({ include: orderForReviewInclude, where: { id: orderId } });

    if (!order) {
      throw new NotFoundException("Order not found.");
    }

    const farmerIds = farmersOnOrder(order);
    const [reviewed, farmers] = await Promise.all([
      this.prisma.review.findMany({ select: { revieweeId: true }, where: { orderId } }),
      this.prisma.legacyUser.findMany({ select: { id: true, name: true }, where: { id: { in: farmerIds } } }),
    ]);
    const reviewedFarmerIds = new Set(reviewed.map((review) => review.revieweeId));
    const namesById = new Map(farmers.map((farmer) => [farmer.id, farmer.name]));

    const reviewable = farmerIds
      .filter((farmerId) => reviewRefusal(order, farmerId, user, reviewedFarmerIds.has(farmerId)) === null)
      .map((farmerId) => ({ farmerId, name: namesById.get(farmerId) ?? "" }));

    return { reviewable };
  }

  async create(orderId: string, dto: CreateReviewDto, user: AuthenticatedUser) {
    const order = await this.prisma.legacyOrder.findUnique({ include: orderForReviewInclude, where: { id: orderId } });

    if (!order) {
      throw new NotFoundException("Order not found.");
    }

    const alreadyReviewed = Boolean(
      await this.prisma.review.findUnique({
        select: { id: true },
        where: { orderId_revieweeId: { orderId, revieweeId: dto.farmerId } },
      }),
    );
    const refusal = reviewRefusal(order, dto.farmerId, user, alreadyReviewed);

    if (refusal === "NOT_THE_BUYER") {
      throw new ForbiddenException(REFUSAL_MESSAGES[refusal]);
    }

    if (refusal) {
      throw new BadRequestException(REFUSAL_MESSAGES[refusal]);
    }

    const review = await this.prisma.review.create({
      data: {
        authorId: order.buyerId,
        comment: dto.comment?.trim() || null,
        orderId,
        rating: dto.rating,
        revieweeId: dto.farmerId,
      },
      select: publicReviewSelect,
    });

    await this.notifications.notifyUser(dto.farmerId, {
      body: `${review.rating} of 5 from ${review.author.name}.`,
      title: "You have a new review",
    });

    return review;
  }

  /**
   * Staff pull a review from view rather than deleting it: the buyer's record survives, the score
   * stops counting it, and who hid it is on the row.
   */
  async setHidden(id: string, hidden: boolean, user: AuthenticatedUser) {
    const existing = await this.prisma.review.findUnique({ select: { id: true }, where: { id } });

    if (!existing) {
      throw new NotFoundException("Review not found.");
    }

    return this.prisma.review.update({
      data: {
        hiddenAt: hidden ? new Date() : null,
        hiddenById: hidden ? user.id : null,
      },
      select: publicReviewSelect,
      where: { id },
    });
  }
}
