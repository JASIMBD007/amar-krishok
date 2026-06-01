import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AccountModule } from "./modules/account/account.module";
import { AdminModule } from "./modules/admin/admin.module";
import { AuthModule } from "./modules/auth/auth.module";
import { ChatModule } from "./modules/chat/chat.module";
import { DistrictsModule } from "./modules/districts/districts.module";
import { HealthModule } from "./modules/health/health.module";
import { LotsModule } from "./modules/lots/lots.module";
import { MarketPricesModule } from "./modules/market-prices/market-prices.module";
import { NotificationsModule } from "./modules/notifications/notifications.module";
import { OrdersModule } from "./modules/orders/orders.module";
import { PrismaModule } from "./modules/prisma/prisma.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    HealthModule,
    AccountModule,
    AuthModule,
    AdminModule,
    DistrictsModule,
    LotsModule,
    OrdersModule,
    NotificationsModule,
    MarketPricesModule,
    ChatModule,
  ],
})
export class AppModule {}
