import { Injectable } from "@nestjs/common";
import { AccountStatus, LotStatus, PaymentStatus, Role } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

const RATE_WINDOW_DAYS = 7;

/** Median rather than mean: one slow release should not distort the headline figure. */
function median(values: number[]) {
  if (values.length === 0) {
    return null;
  }

  const sorted = [...values].sort((first, second) => first - second);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];
}

@Injectable()
export class StatsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * The figures the landing page puts its name to. Every one is counted from real records, so the
   * claims on the front page stay true as the platform grows rather than being frozen copy.
   */
  async platform() {
    const since = new Date();
    since.setDate(since.getDate() - RATE_WINDOW_DAYS);

    const [verifiedFarmers, liveListings, cropsWithRates, releasedPayments] = await Promise.all([
      this.prisma.legacyUser.count({ where: { role: Role.FARMER, status: AccountStatus.ACTIVE } }),
      this.prisma.cropLot.count({ where: { status: LotStatus.ACTIVE } }),
      // We publish one national benchmark rather than per-market feeds, so the honest figure is
      // how many crops carry a live rate — not a market count we cannot stand behind.
      this.prisma.marketPrice.findMany({
        distinct: ["cropId"],
        select: { cropId: true },
        where: { priceDate: { gte: since } },
      }),
      this.prisma.payment.findMany({
        select: { createdAt: true, releasedAt: true },
        where: { releasedAt: { not: null }, status: PaymentStatus.RELEASED },
      }),
    ]);

    const releaseMinutes = releasedPayments
      .filter((payment) => payment.releasedAt)
      .map((payment) => (payment.releasedAt!.getTime() - payment.createdAt.getTime()) / 60_000)
      .filter((minutes) => minutes >= 0);

    return {
      liveListings,
      cropsTracked: cropsWithRates.length,
      /** Null until a payment has actually been released — the UI hides the figure rather than inventing one. */
      medianReleaseMinutes: median(releaseMinutes),
      verifiedFarmers,
    };
  }
}
