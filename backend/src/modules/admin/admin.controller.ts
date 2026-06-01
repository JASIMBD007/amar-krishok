import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Role } from "@prisma/client";
import { Auth } from "../auth/decorators/auth.decorator";
import { AdminService } from "./admin.service";
import { AdminCreateAccountDto, AdminUpdateAccountDto } from "./dto/account-management.dto";

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

  @Post("accounts")
  createAccount(@Body() dto: AdminCreateAccountDto) {
    return this.adminService.createAccount(dto);
  }

  @Patch("accounts/:id")
  updateAccount(@Param("id") id: string, @Body() dto: AdminUpdateAccountDto) {
    return this.adminService.updateAccount(id, dto);
  }

  @Delete("accounts/:id")
  deleteAccount(@Param("id") id: string) {
    return this.adminService.deleteAccount(id);
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
