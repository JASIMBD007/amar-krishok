import { Module } from "@nestjs/common";
import { NotificationsService } from "./notifications.service";

@Module({
  exports: [NotificationsService],
  providers: [NotificationsService],
})
export class NotificationsModule {}
