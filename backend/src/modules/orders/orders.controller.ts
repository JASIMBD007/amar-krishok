import { Body, Controller, Get, Post, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Role } from "@prisma/client";
import { Auth } from "../auth/decorators/auth.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { AuthenticatedUser } from "../auth/types/authenticated-user";
import { CreateOrderDto } from "./dto/create-order.dto";
import { OrdersService } from "./orders.service";

@ApiTags("orders")
@Controller("orders")
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Auth(Role.ADMIN, Role.BUYER)
  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser, @Query("buyerId") buyerId?: string) {
    return this.ordersService.findAll({ buyerId }, user);
  }

  @Auth(Role.ADMIN, Role.BUYER)
  @Post()
  create(@Body() dto: CreateOrderDto, @CurrentUser() user: AuthenticatedUser) {
    return this.ordersService.create(dto, user);
  }
}
