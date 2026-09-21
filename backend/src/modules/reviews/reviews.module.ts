import { Module } from "@nestjs/common";
import { NotificationsModule } from "../notifications/notifications.module";
import { ReviewsController } from "./reviews.controller";
import { ReviewsService } from "./reviews.service";

@Module({
  controllers: [ReviewsController],
  exports: [ReviewsService],
  imports: [NotificationsModule],
  providers: [ReviewsService],
})
export class ReviewsModule {}
