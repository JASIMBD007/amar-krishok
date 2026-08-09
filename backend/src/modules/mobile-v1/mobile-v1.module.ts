import { Module } from "@nestjs/common";
import { NotificationsModule } from "../notifications/notifications.module";

import { CarrierController } from "./carrier.controller";
import { CarrierService } from "./carrier.service";
import { MobileAuthController } from "./mobile-auth.controller";
import { MobileAuthService } from "./mobile-auth.service";
import { MobileBuyerController, MobileFarmerController, MobilePublicController, MobileSharedController } from "./mobile-v1.controllers";
import { MobileV1Service } from "./mobile-v1.service";
import { PlatformJwtGuard, PlatformRolesGuard } from "./platform-auth";

@Module({
  imports: [NotificationsModule],
  controllers: [MobileAuthController, MobilePublicController, MobileSharedController, MobileFarmerController, MobileBuyerController, CarrierController],
  providers: [MobileAuthService, MobileV1Service, CarrierService, PlatformJwtGuard, PlatformRolesGuard],
})
export class MobileV1Module {}
