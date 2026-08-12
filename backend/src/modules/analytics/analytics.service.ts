import { Injectable } from "@nestjs/common";
import { createHash, randomBytes } from "node:crypto";
import { PrismaService } from "../prisma/prisma.service";
import { GeoService } from "./geo.service";

/** Crawlers that do run JavaScript still name themselves. Counting them would flatter the figures. */
const BOT_PATTERN = /bot|crawler|spider|crawling|headless|preview|monitor|pingdom|curl|wget|python-requests/i;
const MAX_DAYS = 365;
const DEFAULT_DAYS = 30;

/**
 * The salt behind the visitor hash. Generated once per process and combined with the date, so it
 * is never written down and cannot be recovered later to re-identify anyone.
 */
const HASH_SECRET = process.env.ANALYTICS_SALT?.trim() || randomBytes(32).toString("hex");

function startOfDayUtc(daysAgo: number) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - daysAgo);
  date.setUTCHours(0, 0, 0, 0);
  return date;
}

function isoDay(date: Date) {
  return date.toISOString().slice(0, 10);
}

@Injectable()
export class AnalyticsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly geo: GeoService,
  ) {}

  /**
   * Records one view. Every failure here is swallowed by the controller: a visitor must never see
   * an error, or wait, because a counter had a bad day.
   */
  async record(input: { ip: string | null; path: string; referrer?: string; userAgent?: string }) {
    if (input.userAgent && BOT_PATTERN.test(input.userAgent)) {
      return;
    }

    await this.prisma.pageView.create({
      data: {
        countryCode: this.geo.lookup(input.ip),
        path: normalisePath(input.path),
        referrerHost: referrerHost(input.referrer),
        visitorHash: this.visitorHash(input.ip, input.userAgent),
      },
    });
  }

  /** The salt rotates at midnight UTC, so yesterday's hashes cannot be matched to today's. */
  private visitorHash(ip: string | null, userAgent?: string) {
    return createHash("sha256")
      .update(`${HASH_SECRET}:${isoDay(new Date())}:${ip ?? "unknown"}:${userAgent ?? ""}`)
      .digest("hex")
      .slice(0, 32);
  }

  /**
   * Everything the Traffic section needs, in one round trip.
   *
   * Unique visitors are counted per day and summed, so the headline is "visitor-days" rather than
   * distinct people over the window — the daily salt makes a true multi-day unique impossible by
   * design, and inventing one would be a number we could not stand behind.
   */
  async summary(days = DEFAULT_DAYS) {
    const window = Math.min(MAX_DAYS, Math.max(1, Math.trunc(days) || DEFAULT_DAYS));
    const since = startOfDayUtc(window - 1);

    const [views, countries, paths, referrers] = await Promise.all([
      this.prisma.pageView.findMany({
        select: { countryCode: true, viewedAt: true, visitorHash: true },
        where: { viewedAt: { gte: since } },
      }),
      this.prisma.pageView.groupBy({
        by: ["countryCode"],
        _count: { _all: true },
        where: { viewedAt: { gte: since } },
      }),
      this.prisma.pageView.groupBy({
        by: ["path"],
        _count: { _all: true },
        orderBy: { _count: { path: "desc" } },
        take: 10,
        where: { viewedAt: { gte: since } },
      }),
      this.prisma.pageView.groupBy({
        by: ["referrerHost"],
        _count: { _all: true },
        orderBy: { _count: { referrerHost: "desc" } },
        take: 8,
        where: { referrerHost: { not: null }, viewedAt: { gte: since } },
      }),
    ]);

    // One pass over the window builds both the daily series and the per-country visitor counts.
    const byDay = new Map<string, { views: number; visitors: Set<string> }>();
    const visitorsByCountry = new Map<string, Set<string>>();
    for (let offset = window - 1; offset >= 0; offset -= 1) {
      byDay.set(isoDay(startOfDayUtc(offset)), { views: 0, visitors: new Set() });
    }

    for (const view of views) {
      const bucket = byDay.get(isoDay(view.viewedAt));
      if (bucket) {
        bucket.views += 1;
        bucket.visitors.add(view.visitorHash);
      }

      const code = view.countryCode ?? "??";
      const seen = visitorsByCountry.get(code) ?? new Set<string>();
      seen.add(view.visitorHash);
      visitorsByCountry.set(code, seen);
    }

    const daily = [...byDay.entries()].map(([date, bucket]) => ({
      date,
      views: bucket.views,
      visitors: bucket.visitors.size,
    }));

    return {
      countries: countries
        .map((row) => ({
          countryCode: row.countryCode ?? "??",
          views: row._count._all,
          visitors: visitorsByCountry.get(row.countryCode ?? "??")?.size ?? 0,
        }))
        .sort((first, second) => second.views - first.views),
      daily,
      days: window,
      /** True once a country database is loaded, so the dashboard can explain an empty map. */
      hasCountryData: countries.some((row) => row.countryCode !== null),
      referrers: referrers.map((row) => ({ host: row.referrerHost ?? "", views: row._count._all })),
      topPaths: paths.map((row) => ({ path: row.path, views: row._count._all })),
      totalViews: views.length,
      totalVisitors: daily.reduce((total, day) => total + day.visitors, 0),
    };
  }
}

/** Query strings can carry a phone number or a reset token, so only the pathname is kept. */
function normalisePath(path: string) {
  const trimmed = (path || "/").split(/[?#]/)[0].trim() || "/";
  const withSlash = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return withSlash.length > 120 ? `${withSlash.slice(0, 117)}...` : withSlash;
}

function referrerHost(referrer?: string) {
  if (!referrer) {
    return null;
  }

  try {
    const host = new URL(referrer).hostname.toLowerCase();
    // Our own pages are navigation, not a traffic source.
    return host.endsWith("amarkrishok.com") || host.includes("amarkrishok.netlify.app") ? null : host.slice(0, 120);
  } catch {
    return null;
  }
}
