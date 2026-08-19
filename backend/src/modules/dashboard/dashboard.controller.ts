import { Controller, Get } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Role } from "@prisma/client";
import { Auth } from "../auth/decorators/auth.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { AuthenticatedUser } from "../auth/types/authenticated-user";
import { DashboardService } from "./dashboard.service";

/**
 * One aggregate per role dashboard, so the workspace is a single request rather than a fan-out, and
 * so the money split and the district-rate comparison are computed in exactly one place.
 */

@ApiTags("dashboard")
@Controller("desk")
export class FarmerDashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Auth(Role.FARMER, Role.ADMIN)
  @Get("dashboard")
  farmer(@CurrentUser() user: AuthenticatedUser) {
    return this.dashboard.farmerDashboard(user);
  }
}

@ApiTags("dashboard")
@Controller("buyer")
export class BuyerDashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Auth(Role.BUYER, Role.ADMIN)
  @Get("dashboard")
  buyer(@CurrentUser() user: AuthenticatedUser) {
    return this.dashboard.buyerDashboard(user);
  }
}
