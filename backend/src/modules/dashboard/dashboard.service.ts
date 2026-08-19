import { Injectable } from "@nestjs/common";
import { LotStatus, OfferStatus, OrderStatus, PaymentStatus, Prisma } from "@prisma/client";
import { AuthenticatedUser } from "../auth/types/authenticated-user";
import { BENCHMARK_DISTRICT, MON_IN_KG } from "../market-prices/market-prices.service";
import {
  amount,
  buyerGross,
  cropSubtotal,
  farmerShare,
  itemsSubtotal,
  platformShare,
} from "../orders/order-money";
import { buyerOrderScope, farmerOrderScope } from "../orders/order-scope";
import { stageOf } from "../orders/escrow";
import { PrismaService } from "../prisma/prisma.service";
import type {
  BuyerDashboard,
  DashboardCropSlice,
  DashboardDayPoint,
  DashboardLedgerRow,
  DashboardStageCount,
  DashboardTask,
  FarmerDashboard,
} from "./dashboard.types";

/** Timestamps are stored UTC and rendered in Asia/Dhaka; the day a chart buckets by is the Dhaka day. */
const DHAKA = "Asia/Dhaka";

const dhakaDay = new Intl.DateTimeFormat("en-CA", {
  day: "2-digit",
  month: "2-digit",
  timeZone: DHAKA,
  year: "numeric",
});

const dhakaDayLabel = new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", timeZone: DHAKA });

const dhakaMonth = new Intl.DateTimeFormat("en-CA", { month: "2-digit", timeZone: DHAKA, year: "numeric" });

/** A lot's price is above the fair range when it sits more than this over the district rate. */
const ABOVE_FAIR_RANGE = 0.03;

/**
 * How far back to look for the rate in force on a given trading day. Rates are published daily, so
 * this only matters across a gap in publication; beyond it an order simply has no comparison.
 */
const RATE_LOOKBACK_DAYS = 30;

const orderScopeInclude = {
  district: { select: { name: true } },
  items: {
    include: {
      crop: { select: { name: true } },
      cropLot: { select: { district: { select: { name: true } }, farmerId: true, id: true } },
    },
  },
  payments: { orderBy: { createdAt: "desc" } },
} satisfies Prisma.LegacyOrderInclude;

type ScopedOrder = Prisma.LegacyOrderGetPayload<{ include: typeof orderScopeInclude }>;

function referenceFor(order: { id: string }) {
  // The same reference the order table and the tracking page show, so the copy on one panel can be
  // matched to a row on another. Order codes are not a separate column on this table yet.
  return order.id.slice(-8).toUpperCase();
}

function isRefunded(order: ScopedOrder) {
  return order.status === OrderStatus.CANCELLED || order.payments.some((payment) => payment.status === PaymentStatus.REFUNDED);
}

function isSettled(order: ScopedOrder) {
  return stageOf(order.status) >= 5;
}

/** Live means the money is still in play: placed, not refunded, not yet paid out. */
function isLive(order: ScopedOrder) {
  return !isRefunded(order) && !isSettled(order);
}

function plural(count: number, one: string, many: string) {
  return `${count} ${count === 1 ? one : many}`;
}

function stageCounts(orders: ScopedOrder[]): DashboardStageCount[] {
  const open = orders.filter((order) => !isRefunded(order));
  const at = (stage: number) => open.filter((order) => stageOf(order.status) === stage).length;

  return [
    { key: "awaiting-pickup", label: "Awaiting pickup", count: at(1) + at(2) },
    { key: "in-transit", label: "In transit", count: at(3) },
    { key: "delivered", label: "Delivered · escrow held", count: at(4) },
    { key: "paid-out", label: "Paid out", count: open.filter((order) => stageOf(order.status) >= 5).length },
  ];
}

/**
 * Value moved per day, bucketed by the day each order was actually placed. Index-modulo bucketing
 * once put a single order on an arbitrary weekday, which is why the date is carried through.
 */
function daySeries(orders: ScopedOrder[], valueOf: (order: ScopedOrder) => number): DashboardDayPoint[] {
  const byDay = new Map<string, number>();

  for (const order of orders) {
    const date = dhakaDay.format(order.createdAt);
    byDay.set(date, (byDay.get(date) ?? 0) + valueOf(order));
  }

  return Array.from(byDay.entries())
    .sort(([first], [second]) => first.localeCompare(second))
    .map(([date, value]) => ({
      date,
      label: dhakaDayLabel.format(new Date(`${date}T00:00:00Z`)),
      value: Math.round(value),
    }));
}

function byCropFromOrders(orders: ScopedOrder[]): DashboardCropSlice[] {
  const byCrop = new Map<string, number>();

  for (const order of orders) {
    const subtotal = cropSubtotal(order);
    const itemTotal = itemsSubtotal(order.items);

    for (const item of order.items) {
      // Split the stored subtotal across the items in proportion to their own value, so rounding on
      // the order does not land entirely on the first crop.
      const share = itemTotal > 0 ? (amount(item.quantityKg) * amount(item.offeredPricePerKg)) / itemTotal : 0;
      byCrop.set(item.crop.name, (byCrop.get(item.crop.name) ?? 0) + subtotal * share);
    }
  }

  return Array.from(byCrop.entries())
    .map(([crop, value]) => ({ crop, value: Math.round(value) }))
    .sort((first, second) => second.value - first.value);
}

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Everything the farmer dashboard renders, in one request and scoped to this farmer's own orders.
   * Every money figure is their own share of the crop subtotal — never the gross the buyer paid,
   * which also carries the carrier's transport and the platform's fee, and never another farmer's.
   */
  async farmerDashboard(user: AuthenticatedUser): Promise<FarmerDashboard> {
    const farmerId = user.id;

    const [account, orders, lots, offers, payouts, ratesPublishedAt] = await Promise.all([
      this.account(farmerId),
      this.prisma.legacyOrder.findMany({
        include: orderScopeInclude,
        orderBy: { createdAt: "desc" },
        where: farmerOrderScope(farmerId),
      }),
      this.prisma.cropLot.findMany({
        include: { crop: { select: { name: true } }, district: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
        where: { farmerId },
      }),
      this.prisma.lotOffer.findMany({
        include: { buyer: { select: { name: true } }, cropLot: { include: { crop: { select: { name: true } } } } },
        orderBy: { pricePerKg: "desc" },
        where: { cropLot: { farmerId }, status: OfferStatus.OPEN },
      }),
      this.prisma.legacyPayout.findMany({ where: { farmerId, status: PaymentStatus.RELEASED } }),
      this.latestRatePublication(),
    ]);

    const share = (order: ScopedOrder) => farmerShare(order, farmerId);
    const live = orders.filter(isLive);
    const activeLots = lots.filter((lot) => lot.status === LotStatus.ACTIVE);

    // Withdrawable is what has actually been released and not yet claimed, from the payout ledger.
    const withdrawable = payouts
      .filter((payout) => !payout.walletRef)
      .reduce((total, payout) => total + amount(payout.amount), 0);

    const dearLots = await this.lotsAboveFairRange(activeLots);

    const tasks: DashboardTask[] = [];
    if (offers.length > 0) {
      const top = offers[0];
      tasks.push({
        action: "offers",
        body: `The highest is ৳ ${Math.round(amount(top.pricePerKg) * MON_IN_KG).toLocaleString("en-IN")} / mon on ${top.cropLot.crop.name} Grade ${top.cropLot.grade}.`,
        cta: "Review offers",
        icon: "tag",
        key: "offers-waiting",
        title: `${plural(offers.length, "offer", "offers")} waiting on your answer`,
        tone: "blue",
      });
    }
    if (dearLots.length > 0) {
      const worst = dearLots[0];
      tasks.push({
        action: "listings",
        body: `${worst.crop} Grade ${worst.grade} sits ${worst.percentOver} % over today's district rate.`,
        cta: "Open listings",
        icon: "trending-down",
        key: "priced-above-range",
        title:
          dearLots.length === 1
            ? "One lot is priced above the fair range"
            : `${dearLots.length} lots are priced above the fair range`,
        tone: "amber",
      });
    }
    if (orders.length === 0) {
      tasks.push({
        action: "post",
        body: "Buyers in your district see a new lot as soon as you publish it.",
        cta: "Post a crop",
        icon: "sprout",
        key: "no-sales-yet",
        title: "No sales yet this season",
        tone: "neutral",
      });
    }

    return {
      role: "farmer",
      identity: account,
      ratesPublishedAt,
      counts: { listings: activeLots.length, offers: offers.length, sales: live.length },
      kpis: {
        withdrawable: Math.round(withdrawable),
        canWithdraw: withdrawable > 0,
        inEscrow: Math.round(live.reduce((total, order) => total + share(order), 0)),
        liveOrderCount: live.length,
        activeListings: activeLots.length,
        listedMon: Math.round(activeLots.reduce((total, lot) => total + amount(lot.quantityKg), 0) / MON_IN_KG),
        season: Math.round(
          orders.filter((order) => !isRefunded(order)).reduce((total, order) => total + share(order), 0),
        ),
        saleCount: orders.filter((order) => !isRefunded(order)).length,
      },
      tasks,
      stages: stageCounts(orders),
      daySeries: daySeries(orders.filter((order) => !isRefunded(order)), share),
      tradingDays: new Set(orders.filter((order) => !isRefunded(order)).map((order) => dhakaDay.format(order.createdAt)))
        .size,
      // The farmer's breakdown is the value they have on the market, not what has sold.
      byCrop: Array.from(
        activeLots
          .reduce((byCrop, lot) => {
            const value = amount(lot.quantityKg) * amount(lot.pricePerKg);
            return byCrop.set(lot.crop.name, (byCrop.get(lot.crop.name) ?? 0) + value);
          }, new Map<string, number>())
          .entries(),
      )
        .map(([crop, value]) => ({ crop, value: Math.round(value) }))
        .sort((first, second) => second.value - first.value),
      nextMovement: this.nextMovement(live, share),
      ledger: this.farmerLedger(orders, farmerId),
      payoutAccount: await this.payoutAccount(farmerId),
    };
  }

  /**
   * Everything the buyer dashboard renders, scoped to this buyer's own orders. Their escrow and
   * spend are the gross they paid; the rate comparison uses the crop subtotal only.
   */
  async buyerDashboard(user: AuthenticatedUser): Promise<BuyerDashboard> {
    const buyerId = user.id;

    const [account, orders, ratesPublishedAt] = await Promise.all([
      this.account(buyerId),
      this.prisma.legacyOrder.findMany({
        include: orderScopeInclude,
        orderBy: { createdAt: "desc" },
        where: buyerOrderScope(buyerId),
      }),
      this.latestRatePublication(),
    ]);

    const active = orders.filter((order) => !isRefunded(order));
    const live = orders.filter(isLive);
    const delivered = active.filter((order) => stageOf(order.status) === 4);
    const settled = active.filter(isSettled);
    const thisMonth = dhakaMonth.format(new Date());
    const monthOrders = active.filter((order) => dhakaMonth.format(order.createdAt) === thisMonth);

    const comparison = await this.districtRateComparison(active);

    const tasks: DashboardTask[] = [];
    if (delivered.length > 0) {
      tasks.push({
        action: "orders",
        body: "Confirming a delivery releases that order's escrow to the farmer.",
        cta: "Open orders",
        icon: "package-check",
        key: "confirm-delivery",
        title:
          delivered.length === 1
            ? "One delivery is waiting for your confirmation"
            : `${delivered.length} deliveries are waiting for your confirmation`,
        tone: "green",
      });
    }
    if (settled.length > 0) {
      tasks.push({
        action: "payments",
        body: "For orders that have been delivered and paid out.",
        cta: "Open payments",
        icon: "file-text",
        key: "invoices-ready",
        title: settled.length === 1 ? "One invoice is ready" : `${settled.length} invoices are ready`,
        tone: "neutral",
      });
    }
    if (orders.length === 0) {
      tasks.push({
        action: "market",
        body: "Every lot is shown next to today's published district rate, so you can see what is fair before you order.",
        cta: "Browse the market",
        icon: "search",
        key: "no-orders-yet",
        title: "No orders yet",
        tone: "blue",
      });
    }

    const suppliers = Array.from(
      active
        .reduce((bySupplier, order) => {
          for (const item of order.items) {
            const farmerId = item.cropLot?.farmerId;
            if (!farmerId) {
              continue;
            }

            const existing = bySupplier.get(farmerId) ?? {
              district: item.cropLot?.district?.name ?? order.district.name,
              orders: new Set<string>(),
              value: 0,
            };
            existing.orders.add(order.id);
            existing.value += amount(item.quantityKg) * amount(item.offeredPricePerKg);
            bySupplier.set(farmerId, existing);
          }

          return bySupplier;
        }, new Map<string, { district: string; orders: Set<string>; value: number }>())
        .entries(),
    );

    const supplierNames = await this.prisma.legacyUser.findMany({
      select: { id: true, name: true },
      where: { id: { in: suppliers.map(([farmerId]) => farmerId) } },
    });
    const nameById = new Map(supplierNames.map((supplier) => [supplier.id, supplier.name]));

    return {
      role: "buyer",
      identity: account,
      ratesPublishedAt,
      counts: { orders: active.length, suppliers: suppliers.length },
      kpis: {
        heldInEscrow: Math.round(live.reduce((total, order) => total + buyerGross(order), 0)),
        openOrderCount: live.length,
        spendThisMonth: Math.round(monthOrders.reduce((total, order) => total + buyerGross(order), 0)),
        ordersThisMonth: monthOrders.length,
        savedVsRate: comparison.comparedOrderCount > 0 ? Math.round(comparison.rateValue - comparison.cropValue) : null,
        savedVsRateDelta:
          comparison.comparedOrderCount > 0 && comparison.rateValue > 0
            ? Math.round((comparison.cropValue / comparison.rateValue - 1) * 1000) / 10
            : null,
        comparedOrderCount: comparison.comparedOrderCount,
        needsAction: delivered.length,
      },
      tasks,
      stages: stageCounts(orders),
      daySeries: daySeries(active, buyerGross),
      tradingDays: new Set(active.map((order) => dhakaDay.format(order.createdAt))).size,
      byCrop: byCropFromOrders(active),
      // The buyer's card names the farmer's share, because that is the money that will move next.
      nextMovement: this.nextMovement(live, cropSubtotal),
      ledger: this.buyerLedger(orders),
      suppliers: suppliers
        .map(([farmerId, supplier]) => ({
          district: supplier.district,
          name: nameById.get(farmerId) ?? "",
          orderCount: supplier.orders.size,
          value: Math.round(supplier.value),
        }))
        .sort((first, second) => second.value - first.value),
      paymentMethod: orders.find((order) => order.paymentMethod)?.paymentMethod ?? null,
    };
  }

  /**
   * Verification state comes off the user record — the same column the admin Users table reads —
   * rather than a name comparison. Only farmers have documents to be pending on.
   */
  private async account(userId: string) {
    const user = await this.prisma.legacyUser.findUniqueOrThrow({
      select: { district: { select: { name: true } }, name: true, role: true, upazilla: true, verifiedAt: true },
      where: { id: userId },
    });

    const place = [user.upazilla, user.district?.name].filter(Boolean).join(", ");

    return {
      district: place || user.district?.name || "",
      name: user.name,
      verified: Boolean(user.verifiedAt),
      verificationPending: user.role === "FARMER" && !user.verifiedAt,
    };
  }

  /** When today's rates were published, for the "Rates updated today 08:00" line in the header. */
  private async latestRatePublication() {
    const latest = await this.prisma.marketPrice.findFirst({
      orderBy: { priceDate: "desc" },
      select: { priceDate: true },
    });

    return latest ? latest.priceDate.toISOString() : null;
  }

  private async payoutAccount(farmerId: string) {
    const account = await this.prisma.payoutAccount.findFirst({
      select: { accountNo: true, method: true },
      where: { userId: farmerId },
    });

    if (!account) {
      return null;
    }

    // Masked to the last three digits, as the handoff has it, so a shared screen leaks nothing.
    const digits = account.accountNo.replace(/\D/g, "");
    return { label: account.method, masked: `•••• ${digits.slice(-3)}` };
  }

  /**
   * Lots the farmer has priced more than 3 % over their district's published rate for that crop.
   * Lots without a rate for today are left out — a missing rate is not evidence of a bad price.
   */
  private async lotsAboveFairRange(
    lots: Array<{ crop: { name: string }; district: { name: string }; grade: string; pricePerKg: Prisma.Decimal }>,
  ) {
    const rates = await this.ratesFor(
      lots.map((lot) => ({ crop: lot.crop.name, date: new Date(), district: lot.district.name })),
    );

    return lots
      .map((lot) => {
        const rate = rates.get(rateKey(lot.crop.name, lot.district.name, new Date()));
        if (!rate) {
          return null;
        }

        const over = amount(lot.pricePerKg) / rate - 1;
        return over > ABOVE_FAIR_RANGE
          ? { crop: lot.crop.name, grade: lot.grade, percentOver: Math.round(over * 100) }
          : null;
      })
      .filter((lot): lot is { crop: string; grade: string; percentOver: number } => lot !== null)
      .sort((first, second) => second.percentOver - first.percentOver);
  }

  /**
   * What these orders would have cost at the district rate published on the day each was placed,
   * against what they actually cost. Crop subtotal only: including transport and the fee once
   * produced a dashboard delta that contradicted the same lot's own fair-price badge.
   */
  private async districtRateComparison(orders: ScopedOrder[]) {
    const wanted = orders.flatMap((order) =>
      order.items.map((item) => ({
        crop: item.crop.name,
        date: order.createdAt,
        district: item.cropLot?.district?.name ?? order.district.name,
      })),
    );
    const rates = await this.ratesFor(wanted);

    let cropValue = 0;
    let rateValue = 0;
    let comparedOrderCount = 0;

    for (const order of orders) {
      const subtotal = cropSubtotal(order);
      const itemTotal = itemsSubtotal(order.items);
      let orderCrop = 0;
      let orderRate = 0;
      let comparable = false;

      for (const item of order.items) {
        const district = item.cropLot?.district?.name ?? order.district.name;
        const rate = rates.get(rateKey(item.crop.name, district, order.createdAt));
        if (!rate) {
          continue;
        }

        const itemValue = amount(item.quantityKg) * amount(item.offeredPricePerKg);
        // Compare the stored subtotal, apportioned to this item, against the rate for its quantity.
        orderCrop += itemTotal > 0 ? subtotal * (itemValue / itemTotal) : 0;
        orderRate += rate * amount(item.quantityKg);
        comparable = true;
      }

      if (comparable) {
        cropValue += orderCrop;
        rateValue += orderRate;
        comparedOrderCount += 1;
      }
    }

    return { comparedOrderCount, cropValue, rateValue };
  }

  /**
   * The published rate per kg to compare each (crop, district, day) against: the most recent rate
   * published on or before that trading day, preferring the lot's own district and falling back to
   * the national benchmark, which is where staff publish by default.
   *
   * "On or before" rather than an exact day match, because rates are published once each morning and
   * a trading day in Dhaka begins six hours before the day turns in UTC. Requiring the exact day
   * blanked the comparison for every order placed between midnight Dhaka and the next publication —
   * an eight-hour hole in the product's central figure, every single day.
   *
   * This is not the forbidden fallback: that rule is about a *live* lot, whose fair-price verdict
   * must be hidden when today's rate is missing rather than judged against a stale one. A placed
   * order is compared against the rate that was actually in force when it was placed.
   */
  private async ratesFor(wanted: Array<{ crop: string; date: Date; district: string }>) {
    const rates = new Map<string, number>();
    if (wanted.length === 0) {
      return rates;
    }

    const crops = Array.from(new Set(wanted.map((entry) => entry.crop)));
    const districts = Array.from(new Set([...wanted.map((entry) => entry.district), BENCHMARK_DISTRICT]));
    const days = Array.from(new Set(wanted.map((entry) => dhakaDay.format(entry.date))));

    // Reach back far enough to find the last publication before the oldest order in the set.
    const earliest = new Date(`${days.slice().sort()[0]}T00:00:00.000Z`);
    earliest.setUTCDate(earliest.getUTCDate() - RATE_LOOKBACK_DAYS);

    const prices = await this.prisma.marketPrice.findMany({
      include: { crop: { select: { name: true } }, district: { select: { name: true } } },
      orderBy: { priceDate: "desc" },
      where: {
        crop: { name: { in: crops } },
        district: { name: { in: districts } },
        priceDate: { gte: earliest },
      },
    });

    // priceDate is a day stamp written at UTC midnight, not a moment: read it as a plain date label.
    // Running it through a Dhaka formatter shifts it back a day and stops it matching anything.
    const published = new Map<string, Array<{ day: string; rate: number }>>();
    for (const price of prices) {
      const key = `${price.crop.name}|${price.district.name}`;
      const series = published.get(key) ?? [];
      series.push({ day: price.priceDate.toISOString().slice(0, 10), rate: amount(price.wholesale) });
      published.set(key, series);
    }

    // findMany came back newest-first, so the first entry at or before the day is the one in force.
    const asOf = (key: string, day: string) => published.get(key)?.find((entry) => entry.day <= day)?.rate;

    for (const entry of wanted) {
      const day = dhakaDay.format(entry.date);
      const rate = asOf(`${entry.crop}|${entry.district}`, day) ?? asOf(`${entry.crop}|${BENCHMARK_DISTRICT}`, day);

      if (rate !== undefined) {
        rates.set(rateKey(entry.crop, entry.district, entry.date), rate);
      }
    }

    return rates;
  }

  private nextMovement(live: ScopedOrder[], valueOf: (order: ScopedOrder) => number) {
    // The oldest live order is the next one to settle, because escrow releases in the order it was held.
    const next = live[live.length - 1];
    return next ? { amount: Math.round(valueOf(next)), reference: referenceFor(next) } : null;
  }

  /**
   * The farmer's ledger. Transport and the platform fee are itemised as separate outgoing rows so
   * the three-way split is visible rather than silently netted off the headline figure.
   */
  private farmerLedger(orders: ScopedOrder[], farmerId: string): DashboardLedgerRow[] {
    const rows: DashboardLedgerRow[] = [];

    for (const order of orders) {
      const reference = referenceFor(order);
      const when = order.createdAt.toISOString();
      const paidOut = isSettled(order) && !isRefunded(order);

      rows.push({
        amount: Math.round(farmerShare(order, farmerId)),
        incoming: paidOut,
        key: `${order.id}-share`,
        reference,
        title: paidOut ? "Paid out to you" : isRefunded(order) ? "Refunded to the buyer" : "Your share held in escrow",
        when,
      });

      // The other two slices of the same order, so the farmer can see where the buyer's money went
      // rather than only what reached them.
      if (amount(order.transportAmount) > 0) {
        rows.push({
          amount: Math.round(amount(order.transportAmount)),
          incoming: false,
          key: `${order.id}-transport`,
          reference,
          title: "Transport, paid to the carrier",
          when,
        });
      }

      if (platformShare(order) > 0) {
        rows.push({
          amount: Math.round(platformShare(order)),
          incoming: false,
          key: `${order.id}-fee`,
          reference,
          title: "Platform fee, paid by the buyer",
          when,
        });
      }
    }

    return rows;
  }

  private buyerLedger(orders: ScopedOrder[]): DashboardLedgerRow[] {
    return orders.map((order) => ({
      amount: Math.round(buyerGross(order)),
      // Money leaving the buyer, in both states: it is paid in, then it is passed on.
      incoming: isRefunded(order),
      key: `${order.id}-escrow`,
      reference: referenceFor(order),
      title: isRefunded(order)
        ? "Refunded to you"
        : isSettled(order)
          ? "Escrow released to the farmer"
          : "Paid into escrow",
      when: order.createdAt.toISOString(),
    }));
  }
}

function rateKey(crop: string, district: string, date: Date) {
  return `${crop}|${district}|${dhakaDay.format(date)}`;
}
