import { Injectable } from "@nestjs/common";
import { OrderStatus, Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { CreateOrderDto } from "./dto/create-order.dto";

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(filters: { buyerId?: string }) {
    return this.prisma.order.findMany({
      include: {
        buyer: true,
        district: true,
        items: { include: { crop: true, cropLot: true } },
      },
      orderBy: { createdAt: "desc" },
      where: {
        buyerId: filters.buyerId,
      },
    });
  }

  async create(dto: CreateOrderDto) {
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

    return this.prisma.order.create({
      data: {
        buyerId: dto.buyerId,
        deliveryAddress: dto.deliveryAddress,
        districtId: district.id,
        items: { create: itemInputs },
        notes: dto.notes,
        status: OrderStatus.PENDING,
        targetDate: dto.targetDate ? new Date(dto.targetDate) : undefined,
        totalValue: new Prisma.Decimal(totalValue),
      },
      include: {
        buyer: true,
        district: true,
        items: { include: { crop: true, cropLot: true } },
      },
    });
  }
}
