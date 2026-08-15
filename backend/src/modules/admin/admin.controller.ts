import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Role } from "@prisma/client";
import { Auth } from "../auth/decorators/auth.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { AuthenticatedUser } from "../auth/types/authenticated-user";
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

  @Get("notifications")
  notifications(@CurrentUser() user: AuthenticatedUser) {
    return this.adminService.notifications(user.id);
  }

  @Patch("notifications/:id/read")
  markNotificationRead(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.adminService.markNotificationRead(user.id, id);
  }

  @Patch("notifications/read-all")
  markAllNotificationsRead(@CurrentUser() user: AuthenticatedUser) {
    return this.adminService.markAllNotificationsRead(user.id);
  }

  @Get("password-resets")
  passwordResetRequests() {
    return this.adminService.passwordResetRequests();
  }

  @Patch("password-resets/:id/approve")
  approvePasswordReset(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.adminService.approvePasswordReset(id, user.id);
  }

  @Patch("password-resets/:id/reject")
  rejectPasswordReset(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.adminService.rejectPasswordReset(id, user.id);
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

  @Get("activity")
  activity(@Query("limit") limit?: string) {
    return this.adminService.activity(Number(limit) || undefined);
  }

  @Patch("verifications/:id/approve")
  approveVerification(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.adminService.updateVerification(id, "approve", user.id);
  }

  @Patch("verifications/:id/reject")
  rejectVerification(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.adminService.updateVerification(id, "reject", user.id);
  }

  /** Stage two: the identity document has been seen, so the account may now trade. */
  @Patch("accounts/:id/verify")
  verifyAccount(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.adminService.setVerified(id, true, user.id);
  }

  @Patch("accounts/:id/unverify")
  unverifyAccount(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.adminService.setVerified(id, false, user.id);
  }

  @Get("dashboard")
  dashboard() {
    return this.adminService.dashboard();
  }
}
