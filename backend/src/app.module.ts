import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { validateEnvironment } from "./config/environment";
import { AccountModule } from "./modules/account/account.module";
import { AdminModule } from "./modules/admin/admin.module";
import { AnalyticsModule } from "./modules/analytics/analytics.module";
import { AuthModule } from "./modules/auth/auth.module";
import { ChatModule } from "./modules/chat/chat.module";
import { DashboardModule } from "./modules/dashboard/dashboard.module";
import { DistrictsModule } from "./modules/districts/districts.module";
import { HealthModule } from "./modules/health/health.module";
import { LotsModule } from "./modules/lots/lots.module";
import { MarketPricesModule } from "./modules/market-prices/market-prices.module";
import { MobileV1Module } from "./modules/mobile-v1/mobile-v1.module";
import { NotificationsModule } from "./modules/notifications/notifications.module";
import { OffersModule } from "./modules/offers/offers.module";
import { OrdersModule } from "./modules/orders/orders.module";
import { PrismaModule } from "./modules/prisma/prisma.module";
import { StatsModule } from "./modules/stats/stats.module";
import { UploadsModule } from "./modules/uploads/uploads.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnvironment }),
    ThrottlerModule.forRoot([{ limit: 60, ttl: 60_000 }]),
    PrismaModule,
    HealthModule,
    AccountModule,
    AuthModule,
    AdminModule,
    AnalyticsModule,
    DashboardModule,
    DistrictsModule,
    LotsModule,
    OffersModule,
    OrdersModule,
    NotificationsModule,
    MarketPricesModule,
    StatsModule,
    ChatModule,
    UploadsModule,
    MobileV1Module,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
