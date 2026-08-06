import { Module } from "@nestjs/common";
import { MarketPricesController } from "./market-prices.controller";
import { MarketPricesService } from "./market-prices.service";
import { RatesBootstrapService } from "./rates-bootstrap.service";

@Module({
  controllers: [MarketPricesController],
  providers: [MarketPricesService, RatesBootstrapService],
})
export class MarketPricesModule {}
