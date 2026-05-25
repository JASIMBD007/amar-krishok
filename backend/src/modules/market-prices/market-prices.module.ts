import { Module } from "@nestjs/common";
import { MarketPricesController } from "./market-prices.controller";
import { MarketPricesService } from "./market-prices.service";

@Module({
  controllers: [MarketPricesController],
  providers: [MarketPricesService],
})
export class MarketPricesModule {}
