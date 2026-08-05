import { Body, Controller, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Role } from "@prisma/client";
import { Auth } from "../auth/decorators/auth.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { AuthenticatedUser } from "../auth/types/authenticated-user";
import { CreateOrderDto } from "./dto/create-order.dto";
import { DisputeDecisionDto, EscrowDecisionDto } from "./dto/escrow.dto";
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

  /** A farmer's own escrow and payout totals. Deliberately does not return the buyers' orders. */
  @Auth(Role.ADMIN, Role.FARMER)
  @Get("farmer-escrow")
  farmerEscrow(@CurrentUser() user: AuthenticatedUser) {
    return this.ordersService.farmerEscrowSummary(user);
  }

  @Auth(Role.ADMIN, Role.BUYER)
  @Post()
  create(@Body() dto: CreateOrderDto, @CurrentUser() user: AuthenticatedUser) {
    return this.ordersService.create(dto, user);
  }

  @Auth(Role.ADMIN, Role.BUYER)
  @Patch(":id/advance")
  advance(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.ordersService.advanceStage(id, user);
  }

  @Auth(Role.ADMIN)
  @Patch(":id/escrow")
  decideEscrow(@Param("id") id: string, @Body() dto: EscrowDecisionDto, @CurrentUser() user: AuthenticatedUser) {
    return this.ordersService.decideEscrow(id, dto.action, dto.reason, user);
  }

  @Auth(Role.ADMIN)
  @Patch(":id/dispute")
  decideDispute(@Param("id") id: string, @Body() dto: DisputeDecisionDto, @CurrentUser() user: AuthenticatedUser) {
    return this.ordersService.decideDispute(id, dto.action, dto.reason, user);
  }
}
