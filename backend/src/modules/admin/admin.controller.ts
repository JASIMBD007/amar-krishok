import { Controller, Get, Param, Patch } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { AdminService } from "./admin.service";

@ApiTags("admin")
@Controller("admin")
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get("verifications")
  pendingVerifications() {
    return this.adminService.pendingVerifications();
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
