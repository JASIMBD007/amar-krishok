import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AdminModule } from "./modules/admin/admin.module";
import { AuthModule } from "./modules/auth/auth.module";
import { ChatModule } from "./modules/chat/chat.module";
import { DistrictsModule } from "./modules/districts/districts.module";
import { HealthModule } from "./modules/health/health.module";
import { LotsModule } from "./modules/lots/lots.module";
import { MarketPricesModule } from "./modules/market-prices/market-prices.module";
import { OrdersModule } from "./modules/orders/orders.module";
import { PrismaModule } from "./modules/prisma/prisma.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    HealthModule,
    AuthModule,
    AdminModule,
    DistrictsModule,
    LotsModule,
    OrdersModule,
    MarketPricesModule,
    ChatModule,
  ],
})
export class AppModule {}
