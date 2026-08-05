import { Body, Controller, Get, Post, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Role } from "@prisma/client";
import { Auth } from "../auth/decorators/auth.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { AuthenticatedUser } from "../auth/types/authenticated-user";
import { CreateMarketPriceDto } from "./dto/create-market-price.dto";
import { PublishRatesDto } from "./dto/publish-rates.dto";
import { MarketPricesService } from "./market-prices.service";

@ApiTags("market-prices")
@Controller("market-prices")
export class MarketPricesController {
  constructor(private readonly marketPricesService: MarketPricesService) {}

  @Get()
  findAll(@Query("district") district?: string, @Query("crop") crop?: string) {
    return this.marketPricesService.findAll({ crop, district });
  }

  /** The benchmark every price in the app is shown against. Public: buyers see it before signing in. */
  @Get("rates")
  rates(@Query("district") district?: string) {
    return this.marketPricesService.publishedRates(district);
  }

  @Auth(Role.ADMIN)
  @Post("publish")
  publish(@Body() dto: PublishRatesDto, @CurrentUser() user: AuthenticatedUser) {
    return this.marketPricesService.publishRates(dto, user.id);
  }

  @Auth(Role.ADMIN)
  @Post()
  create(@Body() dto: CreateMarketPriceDto) {
    return this.marketPricesService.create(dto);
  }
}
