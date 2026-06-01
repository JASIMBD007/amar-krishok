import { Module } from "@nestjs/common";
import { NotificationsModule } from "../notifications/notifications.module";
import { OrdersController } from "./orders.controller";
import { OrdersService } from "./orders.service";

@Module({
  controllers: [OrdersController],
  imports: [NotificationsModule],
  providers: [OrdersService],
})
export class OrdersModule {}
