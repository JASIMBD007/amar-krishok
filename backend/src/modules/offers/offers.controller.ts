import { Body, Controller, Get, Param, Patch, Post } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Role } from "@prisma/client";
import { Auth } from "../auth/decorators/auth.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { AuthenticatedUser } from "../auth/types/authenticated-user";
import { CreateLotOfferDto, RespondToLotOfferDto } from "./dto/lot-offer.dto";
import { OffersService } from "./offers.service";

@ApiTags("offers")
@Controller("offers")
export class OffersController {
  constructor(private readonly offersService: OffersService) {}

  @Auth(Role.ADMIN, Role.BUYER, Role.FARMER)
  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.offersService.findAll(user);
  }

  @Auth(Role.ADMIN, Role.BUYER)
  @Post()
  create(@Body() dto: CreateLotOfferDto, @CurrentUser() user: AuthenticatedUser) {
    return this.offersService.create(dto, user);
  }

  @Auth(Role.ADMIN, Role.FARMER)
  @Patch(":id/respond")
  respond(@Param("id") id: string, @Body() dto: RespondToLotOfferDto, @CurrentUser() user: AuthenticatedUser) {
    return this.offersService.respond(id, dto.action, user);
  }
}
