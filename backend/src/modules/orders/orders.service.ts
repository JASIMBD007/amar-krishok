import { BadRequestException, Injectable } from "@nestjs/common";
import { OrderStatus, Prisma, Role } from "@prisma/client";
import { AuthenticatedUser } from "../auth/types/authenticated-user";
import { NotificationsService } from "../notifications/notifications.service";
import { PrismaService } from "../prisma/prisma.service";
import { CreateOrderDto } from "./dto/create-order.dto";

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
  items: { include: { crop: true, cropLot: true } },
} satisfies Prisma.OrderInclude;

@Injectable()
export class OrdersService {
  constructor(
    private readonly notifications: NotificationsService,
    private readonly prisma: PrismaService,
  ) {}

  findAll(filters: { buyerId?: string }, user: AuthenticatedUser) {
    return this.prisma.order.findMany({
      include: orderInclude,
      orderBy: { createdAt: "desc" },
      where: {
        buyerId: user.role === Role.BUYER ? user.id : filters.buyerId,
      },
    });
  }

  async create(dto: CreateOrderDto, user: AuthenticatedUser) {
    const buyerId = user.role === Role.BUYER ? user.id : dto.buyerId;
    if (!buyerId) {
      throw new BadRequestException("buyerId is required when an admin creates an order.");
    }

    const district = await this.prisma.district.upsert({
      create: { name: dto.district },
      update: { active: true },
      where: { name: dto.district },
    });
    const itemInputs = await Promise.all(
      dto.items.map(async (item) => {
        const crop = await this.prisma.crop.upsert({
          create: { name: item.crop },
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
    const totalValue = dto.items.reduce((sum, item) => sum + item.quantityKg * item.offeredPricePerKg, 0);

    const order = await this.prisma.order.create({
      data: {
        buyerId,
        deliveryAddress: dto.deliveryAddress,
        districtId: district.id,
        items: { create: itemInputs },
        notes: dto.notes,
        status: OrderStatus.PENDING,
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
      body: `${order.buyer.name} requested ${order.items.map((item) => item.crop.name).join(", ")}.`,
      title: "New order for your lot",
    });

    return order;
  }
}
