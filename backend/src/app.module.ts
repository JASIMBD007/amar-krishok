import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { AccountModule } from "./modules/account/account.module";
import { AdminModule } from "./modules/admin/admin.module";
import { AuthModule } from "./modules/auth/auth.module";
import { ChatModule } from "./modules/chat/chat.module";
import { DistrictsModule } from "./modules/districts/districts.module";
import { HealthModule } from "./modules/health/health.module";
import { LotsModule } from "./modules/lots/lots.module";
import { MarketPricesModule } from "./modules/market-prices/market-prices.module";
import { NotificationsModule } from "./modules/notifications/notifications.module";
import { OffersModule } from "./modules/offers/offers.module";
import { OrdersModule } from "./modules/orders/orders.module";
import { PrismaModule } from "./modules/prisma/prisma.module";
import { UploadsModule } from "./modules/uploads/uploads.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ limit: 60, ttl: 60_000 }]),
    PrismaModule,
    HealthModule,
    AccountModule,
    AuthModule,
    AdminModule,
    DistrictsModule,
    LotsModule,
    OffersModule,
    OrdersModule,
    NotificationsModule,
    MarketPricesModule,
    ChatModule,
    UploadsModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
