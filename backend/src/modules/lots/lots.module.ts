import { Module } from "@nestjs/common";
import { NotificationsModule } from "../notifications/notifications.module";
import { LotsController } from "./lots.controller";
import { LotsService } from "./lots.service";

@Module({
  controllers: [LotsController],
  imports: [NotificationsModule],
  providers: [LotsService],
})
export class LotsModule {}
