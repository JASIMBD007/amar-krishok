import { Module } from "@nestjs/common";
import { NotificationsModule } from "../notifications/notifications.module";
import { OffersController } from "./offers.controller";
import { OffersService } from "./offers.service";

@Module({
  controllers: [OffersController],
  imports: [NotificationsModule],
  providers: [OffersService],
})
export class OffersModule {}
