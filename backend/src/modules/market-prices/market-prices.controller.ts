import { Body, Controller, Get, Post, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Role } from "@prisma/client";
import { Auth } from "../auth/decorators/auth.decorator";
import { CreateMarketPriceDto } from "./dto/create-market-price.dto";
import { MarketPricesService } from "./market-prices.service";

@ApiTags("market-prices")
@Controller("market-prices")
export class MarketPricesController {
  constructor(private readonly marketPricesService: MarketPricesService) {}

  @Get()
  findAll(@Query("district") district?: string, @Query("crop") crop?: string) {
    return this.marketPricesService.findAll({ crop, district });
  }

  @Auth(Role.ADMIN)
  @Post()
  create(@Body() dto: CreateMarketPriceDto) {
    return this.marketPricesService.create(dto);
  }
}
