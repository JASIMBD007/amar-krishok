import { Controller, Get, Param, Patch, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Role } from "@prisma/client";
import { Auth } from "../auth/decorators/auth.decorator";
import { AdminService } from "./admin.service";

@ApiTags("admin")
@Auth(Role.ADMIN)
@Controller("admin")
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get("verifications")
  pendingVerifications() {
    return this.adminService.pendingVerifications();
  }

  @Get("accounts")
  accounts(@Query("role") role?: string, @Query("status") status?: string) {
    return this.adminService.accounts({ role, status });
  }

  @Patch("verifications/:id/approve")
  approveVerification(@Param("id") id: string) {
    return this.adminService.updateVerification(id, "approve");
  }

  @Patch("verifications/:id/reject")
  rejectVerification(@Param("id") id: string) {
    return this.adminService.updateVerification(id, "reject");
  }

  @Get("dashboard")
  dashboard() {
    return this.adminService.dashboard();
  }
}
