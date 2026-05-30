import { Body, Controller, Get, Post, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Role } from "@prisma/client";
import { Auth } from "../auth/decorators/auth.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { AuthenticatedUser } from "../auth/types/authenticated-user";
import { CreateLotDto } from "./dto/create-lot.dto";
import { LotsService } from "./lots.service";

@ApiTags("lots")
@Controller("lots")
export class LotsController {
  constructor(private readonly lotsService: LotsService) {}

  @Get()
  findAll(@Query("district") district?: string, @Query("crop") crop?: string) {
    return this.lotsService.findAll({ crop, district });
  }

  @Auth(Role.ADMIN, Role.FARMER)
  @Post()
  create(@Body() dto: CreateLotDto, @CurrentUser() user: AuthenticatedUser) {
    return this.lotsService.create(dto, user);
  }
}
