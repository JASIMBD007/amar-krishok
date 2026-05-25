import { Body, Controller, Get, Post, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
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

  @Post()
  create(@Body() dto: CreateMarketPriceDto) {
    return this.marketPricesService.create(dto);
  }
}
