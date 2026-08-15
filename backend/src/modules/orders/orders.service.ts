import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { OrderStatus, PaymentStatus, Prisma, Role } from "@prisma/client";
import { cropCreateData, districtCreateData } from "../../common/catalogue-data";
import { AuthenticatedUser } from "../auth/types/authenticated-user";
import { NotificationsService } from "../notifications/notifications.service";
import { PrismaService } from "../prisma/prisma.service";
import { CreateOrderDto } from "./dto/create-order.dto";
import { nextStatusAfter, platformFeeFor, stageOf } from "./escrow";

const orderInclude = {
  buyer: {
    select: {
      address: true,
      createdAt: true,
      district: { select: { name: true } },
      focus: true,
      id: true,
      identity: true,
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
  district: true,
  items: { include: { crop: true, cropLot: { include: { farmer: { select: { id: true, name: true } } } } } },
  payments: { orderBy: { createdAt: "desc" } },
} satisfies Prisma.LegacyOrderInclude;

@Injectable()
export class OrdersService {
  constructor(
    private readonly notifications: NotificationsService,
    private readonly prisma: PrismaService,
  ) {}

  /** Every order with an open dispute. Staff only — the controller guards it. */
  disputes() {
    return this.prisma.legacyOrder.findMany({
      include: orderInclude,
      orderBy: { disputeOpenedAt: "asc" },
      where: { disputeOpenedAt: { not: null } },
    });
  }

  findAll(filters: { buyerId?: string }, user: AuthenticatedUser) {
    return this.prisma.legacyOrder.findMany({
      include: orderInclude,
      orderBy: { createdAt: "desc" },
      where: {
        buyerId: user.role === Role.BUYER ? user.id : filters.buyerId,
      },
    });
  }

  /**
   * What a farmer is owed, without exposing the buyers' orders to them. "Ready to withdraw" is the
   * sum of released payouts; "in escrow" is the held balance on orders containing their lots.
   */
  async farmerEscrowSummary(user: AuthenticatedUser) {
    const farmerId = user.id;

    const [payouts, heldOrders, allOrders] = await Promise.all([
      this.prisma.legacyPayout.findMany({
        where: { farmerId, status: PaymentStatus.RELEASED },
      }),
      this.prisma.legacyOrder.findMany({
        include: { payments: true },
        where: {
          items: { some: { cropLot: { farmerId } } },
          payments: { some: { status: PaymentStatus.HELD } },
        },
      }),
      this.prisma.legacyOrder.findMany({
        include: { payments: true },
        where: { items: { some: { cropLot: { farmerId } } } },
      }),
    ]);

    const sumHeld = heldOrders.reduce(
      (total, order) =>
        total +
        order.payments
          .filter((payment) => payment.status === PaymentStatus.HELD)
          .reduce((amount, payment) => amount + Number(payment.amount), 0),
      0,
    );

    return {
      grossValue: allOrders.reduce((total, order) => total + Number(order.totalValue), 0),
      held: Math.round(sumHeld),
      heldCount: heldOrders.length,
      orderCount: allOrders.length,
      released: Math.round(payouts.reduce((total, payout) => total + Number(payout.amount), 0)),
      releasedCount: payouts.length,
    };
  }

  /**
   * A farmer asking for their released balance to be paid out. This records the request and puts
   * it in front of staff; it deliberately does not move money, because disbursement runs through
   * bKash outside this system. The balance stays visible until staff confirm the transfer.
   */
  async requestPayout(user: AuthenticatedUser) {
    const payoutAccount = await this.prisma.legacyUser.findUnique({
      select: { paymentAccount: true, paymentAccountUpdatedAt: true },
      where: { id: user.id },
    });
    if (!payoutAccount?.paymentAccount) {
      throw new BadRequestException("Add a payout account in your profile before requesting a withdrawal.");
    }
    if (payoutAccount.paymentAccountUpdatedAt) {
      const lockedUntil = payoutAccount.paymentAccountUpdatedAt.getTime() + 24 * 60 * 60 * 1000;
      if (Date.now() < lockedUntil) {
        throw new BadRequestException("Payouts are paused for 24 hours after the payout account changes.");
      }
    }

    const payouts = await this.prisma.legacyPayout.findMany({
      where: { farmerId: user.id, status: PaymentStatus.RELEASED, walletRef: null },
    });

    const amount = payouts.reduce((total, payout) => total + Number(payout.amount), 0);
    if (amount <= 0) {
      throw new BadRequestException("There is nothing released to withdraw yet.");
    }

    const reference = `WD-${Date.now().toString(36).toUpperCase()}`;

    await this.prisma.$transaction(async (tx) => {
      // Stamping the reference marks these payouts as claimed so a second tap cannot double-request.
      await tx.legacyPayout.updateMany({
        data: { walletRef: reference },
        where: { farmerId: user.id, status: PaymentStatus.RELEASED, walletRef: null },
      });

      await tx.legacyAuditLog.create({
        data: {
          action: "payout.request",
          actorId: user.id,
          metadata: { amount: amount.toFixed(2), payoutCount: payouts.length, reference },
          target: `User:${user.id}`,
        },
      });
    });

    await this.notifications.notifyAdmins({
      body: `${user.name} requested a payout of ৳${amount.toFixed(2)} (${reference}).`,
      title: "Payout requested",
    });
    await this.notifications.notifyUser(user.id, {
      body: `We have your request for ৳${amount.toFixed(2)}. Payouts reach bKash within a few hours on working days.`,
      title: "Withdrawal requested",
    });

    return { amount, reference, requestedPayouts: payouts.length };
  }

  async create(dto: CreateOrderDto, user: AuthenticatedUser) {
    const buyerId = user.role === Role.BUYER ? user.id : dto.buyerId;
    if (!buyerId) {
      throw new BadRequestException("buyerId is required when an admin creates an order.");
    }

    // Money only moves for buyers staff have actually checked. Enforced here rather than in the UI
    // because this is the point where escrow starts.
    if (user.role === Role.BUYER) {
      const buyer = await this.prisma.legacyUser.findUnique({
        select: { verifiedAt: true },
        where: { id: buyerId },
      });

      if (!buyer?.verifiedAt) {
        throw new ForbiddenException("Your account is waiting on verification. Staff will check your documents shortly.");
      }
    }

    const district = await this.prisma.district.upsert({
      create: districtCreateData(dto.district),
      update: { active: true },
      where: { name: dto.district },
    });
    const itemInputs = await Promise.all(
      dto.items.map(async (item) => {
        const crop = await this.prisma.crop.upsert({
          create: cropCreateData(item.crop),
          update: { active: true },
          where: { name: item.crop },
        });

        return {
          cropId: crop.id,
          cropLotId: item.cropLotId,
          offeredPricePerKg: new Prisma.Decimal(item.offeredPricePerKg),
          quantityKg: new Prisma.Decimal(item.quantityKg),
        };
      }),
    );
    const cropValue = dto.items.reduce((sum, item) => sum + item.quantityKg * item.offeredPricePerKg, 0);
    const transportFee = Math.max(0, Math.round(dto.transportFee ?? 0));
    const platformFee = platformFeeFor(cropValue);
    // The buyer pays AmarKrishok, not the farmer, so the escrow amount is the full basket:
    // crop value plus transport plus the platform fee.
    const totalValue = cropValue + transportFee + platformFee;

    const order = await this.prisma.legacyOrder.create({
      data: {
        buyerId,
        deliveryAddress: dto.deliveryAddress,
        districtId: district.id,
        items: { create: itemInputs },
        notes: dto.notes,
        payments: {
          create: {
            amount: new Prisma.Decimal(totalValue),
            method: dto.paymentMethod,
            platformFee: new Prisma.Decimal(platformFee),
            status: PaymentStatus.HELD,
            transportFee: new Prisma.Decimal(transportFee),
          },
        },
        status: OrderStatus.MATCHING,
        targetDate: dto.targetDate ? new Date(dto.targetDate) : undefined,
        totalValue: new Prisma.Decimal(totalValue),
        upazilla: dto.upazilla,
      },
      include: orderInclude,
    });

    await this.notifications.notifyAdmins({
      body: `${order.buyer.name} · ${order.items.map((item) => item.crop.name).join(", ")} · ${order.upazilla || order.district.name}`,
      title: "Order request needs review",
    });
    await this.notifications.notifyUser(order.buyerId, {
      body: `${order.items.map((item) => item.crop.name).join(", ")} · ${order.upazilla || order.district.name} · ${order.status}`,
      title: "Order request received",
    });

    const farmerIds = order.items.map((item) => item.cropLot?.farmerId).filter((farmerId): farmerId is string => Boolean(farmerId));
    await this.notifications.notifyUsers(farmerIds, {
      body: `${order.buyer.name} paid ৳${totalValue.toLocaleString("en-IN")} into escrow for ${order.items.map((item) => item.crop.name).join(", ")}.`,
      title: "New order for your lot",
    });

    return order;
  }

  /**
   * Move the order one step along the escrow timeline. The buyer drives this — confirming pickup,
   * transit and delivery — and reaching the final stage releases the money.
   */
  async advanceStage(id: string, user: AuthenticatedUser) {
    const order = await this.findVisibleOrder(id, user);
    const nextStatus = nextStatusAfter(order.status);

    if (!nextStatus) {
      throw new BadRequestException("This order has already reached the final stage.");
    }

    if (order.disputeOpenedAt) {
      throw new BadRequestException("This order is under dispute. Staff must close the dispute first.");
    }

    const heldPayment = order.payments.find((payment) => payment.status === PaymentStatus.HELD);
    if (!heldPayment && nextStatus === OrderStatus.COMPLETED) {
      throw new BadRequestException("There is no escrow balance left to release on this order.");
    }

    const { settlement, updated } = await this.prisma.$transaction(async (tx) => {
      // Reaching COMPLETED is the buyer confirming delivery, which is what releases escrow.
      const result =
        nextStatus === OrderStatus.COMPLETED && heldPayment
          ? await this.settlePayment(tx, order, heldPayment, "release")
          : { farmerIds: [] as string[], perFarmer: new Prisma.Decimal(0) };

      return {
        settlement: result,
        updated: await tx.legacyOrder.update({
          data: { status: nextStatus },
          include: orderInclude,
          where: { id: order.id },
        }),
      };
    });

    await this.notifyPayout(settlement, updated);
    await this.notifications.notifyUser(updated.buyerId, {
      body: `${updated.items.map((item) => item.crop.name).join(", ")} · stage ${stageOf(updated.status)} of 5 · ${updated.status}`,
      title: nextStatus === OrderStatus.COMPLETED ? "Payment released" : "Order update",
    });

    return updated;
  }

  /** Staff release the money to the farmer, or refund the buyer. Both are recorded in the audit log. */
  async decideEscrow(id: string, action: "release" | "refund", reason: string | undefined, user: AuthenticatedUser) {
    const order = await this.findVisibleOrder(id, user);
    const heldPayment = order.payments.find((payment) => payment.status === PaymentStatus.HELD);

    if (!heldPayment) {
      throw new BadRequestException("This order has no escrow balance to release or refund.");
    }

    const { settlement, updated } = await this.prisma.$transaction(async (tx) => {
      const result = await this.settlePayment(tx, order, heldPayment, action);

      await tx.legacyAuditLog.create({
        data: {
          action: action === "release" ? "escrow.release" : "escrow.refund",
          actorId: user.id,
          metadata: { amount: heldPayment.amount.toString(), orderId: order.id, reason: reason ?? null },
          target: `Order:${order.id}`,
        },
      });

      return {
        settlement: result,
        updated: await tx.legacyOrder.update({
          data: {
            status: action === "release" ? OrderStatus.COMPLETED : OrderStatus.CANCELLED,
          },
          include: orderInclude,
          where: { id: order.id },
        }),
      };
    });

    await this.notifyPayout(settlement, updated);
    await this.notifications.notifyUser(updated.buyerId, {
      body:
        action === "release"
          ? `৳${heldPayment.amount} was released to the farmer for ${updated.id}.`
          : `৳${heldPayment.amount} was refunded to you for ${updated.id}.`,
      title: action === "release" ? "Payment released" : "Payment refunded",
    });

    return updated;
  }

  /** Open or close a dispute. While one is open the timeline is frozen so escrow cannot slip out. */
  async decideDispute(id: string, action: "open" | "close", reason: string | undefined, user: AuthenticatedUser) {
    const order = await this.findVisibleOrder(id, user);

    const updated = await this.prisma.legacyOrder.update({
      data: { disputeOpenedAt: action === "open" ? new Date() : null },
      include: orderInclude,
      where: { id: order.id },
    });

    await this.prisma.legacyAuditLog.create({
      data: {
        action: action === "open" ? "dispute.open" : "dispute.close",
        actorId: user.id,
        metadata: { orderId: order.id, reason: reason ?? null },
        target: `Order:${order.id}`,
      },
    });

    await this.notifications.notifyUser(updated.buyerId, {
      body:
        action === "open"
          ? `Staff opened a dispute on ${updated.id}. Your escrow balance stays held while it is reviewed.`
          : `The dispute on ${updated.id} is closed. The order can continue.`,
      title: action === "open" ? "Dispute opened" : "Dispute closed",
    });

    return updated;
  }

  /**
   * Settle a held payment. A release also writes the farmer's Payout rows so the money owed is
   * recorded per farmer rather than only against the order.
   */
  private async settlePayment(
    tx: Prisma.TransactionClient,
    order: Prisma.LegacyOrderGetPayload<{ include: typeof orderInclude }>,
    payment: { amount: Prisma.Decimal; id: string; platformFee: Prisma.Decimal; transportFee: Prisma.Decimal },
    action: "release" | "refund",
  ) {
    const now = new Date();

    await tx.payment.update({
      data: {
        refundedAt: action === "refund" ? now : null,
        releasedAt: action === "release" ? now : null,
        status: action === "release" ? PaymentStatus.RELEASED : PaymentStatus.REFUNDED,
      },
      where: { id: payment.id },
    });

    if (action !== "release") {
      return { farmerIds: [] as string[], perFarmer: new Prisma.Decimal(0) };
    }

    // The farmer is owed the crop value only: transport and the platform fee are ours.
    const farmerShare = payment.amount.minus(payment.transportFee).minus(payment.platformFee);
    const farmerIds = Array.from(
      new Set(order.items.map((item) => item.cropLot?.farmerId).filter((farmerId): farmerId is string => Boolean(farmerId))),
    );

    if (farmerIds.length === 0) {
      return { farmerIds, perFarmer: new Prisma.Decimal(0) };
    }

    const perFarmer = farmerShare.dividedBy(farmerIds.length);

    for (const farmerId of farmerIds) {
      await tx.legacyPayout.create({
        data: {
          amount: perFarmer,
          farmerId,
          paymentId: payment.id,
          releasedAt: now,
          status: PaymentStatus.RELEASED,
        },
      });
    }

    return { farmerIds, perFarmer };
  }

  /** Told after the transaction commits, so a rollback never leaves a false payout notice behind. */
  private async notifyPayout(
    settlement: { farmerIds: string[]; perFarmer: Prisma.Decimal },
    order: Prisma.LegacyOrderGetPayload<{ include: typeof orderInclude }>,
  ) {
    if (settlement.farmerIds.length === 0) {
      return;
    }

    await this.notifications.notifyUsers(settlement.farmerIds, {
      body: `৳${settlement.perFarmer.toFixed(2)} was released for ${order.items.map((item) => item.crop.name).join(", ")}.`,
      title: "Payout released",
    });
  }

  private async findVisibleOrder(id: string, user: AuthenticatedUser) {
    const order = await this.prisma.legacyOrder.findUnique({ include: orderInclude, where: { id } });

    if (!order) {
      throw new NotFoundException("Order not found.");
    }

    if (user.role !== Role.ADMIN && order.buyerId !== user.id) {
      throw new ForbiddenException("You can only manage your own orders.");
    }

    return order;
  }
}
