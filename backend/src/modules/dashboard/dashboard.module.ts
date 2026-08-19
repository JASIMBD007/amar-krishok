import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { BuyerDashboardController, FarmerDashboardController } from "./dashboard.controller";
import { DashboardService } from "./dashboard.service";

@Module({
  controllers: [FarmerDashboardController, BuyerDashboardController],
  imports: [PrismaModule],
  providers: [DashboardService],
})
export class DashboardModule {}
