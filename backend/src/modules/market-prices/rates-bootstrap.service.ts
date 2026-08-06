import { Injectable, Logger, OnApplicationBootstrap } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { BENCHMARK_DISTRICT, MON_IN_KG } from "./market-prices.service";

/**
 * Opening rates for the crops the platform tracks, in ৳ per mon.
 *
 * Without these the marketplace has no benchmark, so the rate ticker, every delta pill, the
 * fair-price panel and the farmer's pricing advice all stay hidden — the product's whole promise
 * is invisible on a fresh install. Staff republish from the admin console; this only ever fills
 * the gap when nothing has been published at all.
 */
const OPENING_RATES: Record<string, number> = {
  "Boro rice": 1340,
  Cucumber: 960,
  Eggplant: 1160,
  "Green Chilli": 3440,
  Jute: 3100,
  Mango: 2880,
  Onion: 2250,
  Potato: 1250,
  Rice: 1520,
  Tomato: 980,
};

/** Yesterday's move per crop, so the change column reads honestly from the first day. */
const OPENING_MOVES: Record<string, number> = {
  "Boro rice": 2.1,
  Cucumber: -2.1,
  Eggplant: 0,
  "Green Chilli": 6.2,
  Jute: 0.9,
  Mango: 3.5,
  Onion: 4.8,
  Potato: -1.4,
  Rice: 0.9,
  Tomato: 2.4,
};

@Injectable()
export class RatesBootstrapService implements OnApplicationBootstrap {
  private readonly logger = new Logger(RatesBootstrapService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onApplicationBootstrap() {
    const existing = await this.prisma.marketPrice.count({
      where: { district: { name: BENCHMARK_DISTRICT } },
    });

    // Never overwrite what staff have published — this is a first-run seed, not a reset.
    if (existing > 0) {
      return;
    }

    const priceDate = new Date();
    priceDate.setUTCHours(0, 0, 0, 0);
    // Seed yesterday too, so the change column has something real to measure against instead of
    // reading 0.0 % on every crop until the second day of publishing.
    const previousDate = new Date(priceDate);
    previousDate.setUTCDate(previousDate.getUTCDate() - 1);

    const district = await this.prisma.district.upsert({
      create: { name: BENCHMARK_DISTRICT },
      update: {},
      where: { name: BENCHMARK_DISTRICT },
    });

    for (const [cropName, ratePerMon] of Object.entries(OPENING_RATES)) {
      const crop = await this.prisma.crop.upsert({
        create: { name: cropName },
        update: { active: true },
        where: { name: cropName },
      });
      const wholesale = new Prisma.Decimal(ratePerMon).dividedBy(MON_IN_KG);
      const yesterdayMove = OPENING_MOVES[cropName] ?? 0;
      const previousWholesale = wholesale.dividedBy(1 + yesterdayMove / 100);

      for (const [date, value] of [
        [previousDate, previousWholesale],
        [priceDate, wholesale],
      ] as const) {
        await this.prisma.marketPrice.upsert({
          create: {
            cropId: crop.id,
            districtId: district.id,
            farmerAsk: value.times(0.86),
            priceDate: date,
            retail: value.times(1.16),
            source: "Opening benchmark",
            wholesale: value,
          },
          update: {},
          where: {
            cropId_districtId_priceDate: { cropId: crop.id, districtId: district.id, priceDate: date },
          },
        });
      }
    }

    this.logger.log(`Seeded ${Object.keys(OPENING_RATES).length} opening district rates.`);
  }
}
