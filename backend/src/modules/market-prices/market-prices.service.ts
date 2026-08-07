import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { cropCreateData, districtCreateData } from "../../common/catalogue-data";
import { PrismaService } from "../prisma/prisma.service";
import { CreateMarketPriceDto } from "./dto/create-market-price.dto";
import { PublishRatesDto } from "./dto/publish-rates.dto";

/** 1 mon = 40 kg. Rates are quoted per mon; the table stores per kg. */
export const MON_IN_KG = 40;
/** How many days of history the sparkline and the lot page's rate chart read. */
const HISTORY_DAYS = 30;
const HISTORY_POINTS = 12;

/** The national benchmark rate lives under this district name so it can be looked up as a fallback. */
export const BENCHMARK_DISTRICT = "All districts";

function startOfUtcDay(value: Date) {
  const date = new Date(value);
  date.setUTCHours(0, 0, 0, 0);
  return date;
}

@Injectable()
export class MarketPricesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Today's published rate per crop, with the previous published value so the UI can show the
   * daily change, and a downsampled history for the sparklines.
   *
   * Everything the marketplace compares against comes from here, which is why it is a single
   * unauthenticated read rather than something each surface assembles itself.
   */
  async publishedRates(district?: string) {
    const since = startOfUtcDay(new Date());
    since.setUTCDate(since.getUTCDate() - HISTORY_DAYS);

    const prices = await this.prisma.marketPrice.findMany({
      include: { crop: { select: { name: true } }, district: { select: { name: true } } },
      orderBy: { priceDate: "desc" },
      where: {
        district: district && district !== BENCHMARK_DISTRICT ? { name: district } : { name: BENCHMARK_DISTRICT },
        priceDate: { gte: since },
      },
    });

    const byCrop = new Map<string, typeof prices>();
    for (const price of prices) {
      byCrop.set(price.crop.name, [...(byCrop.get(price.crop.name) ?? []), price]);
    }

    return {
      district: district ?? BENCHMARK_DISTRICT,
      monInKg: MON_IN_KG,
      rates: Array.from(byCrop.entries()).map(([crop, series]) => {
        // findMany came back newest-first, so index 0 is today's rate and index 1 is the one before.
        const perMon = (value: Prisma.Decimal) => Math.round(Number(value) * MON_IN_KG);
        const history = [...series]
          .reverse()
          .slice(-HISTORY_POINTS)
          .map((entry) => ({ date: entry.priceDate.toISOString().slice(0, 10), ratePerMon: perMon(entry.wholesale) }));

        return {
          crop,
          history,
          previousRatePerMon: series[1] ? perMon(series[1].wholesale) : perMon(series[0].wholesale),
          publishedAt: series[0].priceDate.toISOString(),
          ratePerMon: perMon(series[0].wholesale),
        };
      }),
    };
  }

  /**
   * Publish today's rates in one transaction. This rewrites the benchmark every listing delta,
   * alert, fair-price panel and pricing hint is measured against, so it is all-or-nothing.
   */
  async publishRates(dto: PublishRatesDto, actorId: string) {
    const districtName = dto.district?.trim() || BENCHMARK_DISTRICT;
    const priceDate = startOfUtcDay(new Date());

    const district = await this.prisma.district.upsert({
      create: districtCreateData(districtName),
      update: { active: true },
      where: { name: districtName },
    });

    const crops = await Promise.all(
      dto.rates.map((rate) =>
        this.prisma.crop.upsert({
          create: cropCreateData(rate.crop),
          update: { active: true },
          where: { name: rate.crop.trim() },
        }),
      ),
    );

    await this.prisma.$transaction(async (tx) => {
      for (const [index, rate] of dto.rates.entries()) {
        const wholesalePerKg = new Prisma.Decimal(rate.ratePerMon).dividedBy(MON_IN_KG);
        // farmerAsk and retail bracket the wholesale rate; they are what the public price table shows.
        const farmerAsk = wholesalePerKg.times(0.86);
        const retail = wholesalePerKg.times(1.16);

        await tx.marketPrice.upsert({
          create: {
            cropId: crops[index].id,
            districtId: district.id,
            farmerAsk,
            priceDate,
            retail,
            source: dto.source ?? "Staff publish",
            wholesale: wholesalePerKg,
          },
          update: {
            farmerAsk,
            retail,
            source: dto.source ?? "Staff publish",
            wholesale: wholesalePerKg,
          },
          where: {
            cropId_districtId_priceDate: { cropId: crops[index].id, districtId: district.id, priceDate },
          },
        });
      }

      await tx.legacyAuditLog.create({
        data: {
          action: "rates.publish",
          actorId,
          metadata: {
            district: districtName,
            rates: dto.rates.map((rate) => ({ crop: rate.crop, ratePerMon: rate.ratePerMon })),
          },
          target: `MarketPrice:${districtName}:${priceDate.toISOString().slice(0, 10)}`,
        },
      });
    });

    return this.publishedRates(districtName);
  }

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
