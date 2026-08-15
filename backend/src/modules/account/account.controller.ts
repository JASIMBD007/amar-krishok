import { Body, Controller, Get, Patch } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Role } from "@prisma/client";
import { Auth } from "../auth/decorators/auth.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { AuthenticatedUser } from "../auth/types/authenticated-user";
import { AccountService } from "./account.service";
import { UpdateProfileDto } from "./dto/update-profile.dto";
import { ChangePasswordDto, UpdateNotificationPreferencesDto, UpdatePaymentDetailsDto } from "./dto/update-profile-settings.dto";

@ApiTags("account")
@Controller("account")
export class AccountController {
  constructor(private readonly accountService: AccountService) {}

  @Auth(Role.ADMIN, Role.BUYER, Role.FARMER)
  @Get("me")
  me(@CurrentUser() user: AuthenticatedUser) {
    return this.accountService.me(user);
  }

  @Auth(Role.BUYER, Role.FARMER)
  @Patch("me")
  updateMe(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpdateProfileDto) {
    return this.accountService.updateMe(user, dto);
  }

  @Auth(Role.BUYER, Role.FARMER)
  @Patch("me/payment")
  updatePayment(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpdatePaymentDetailsDto) {
    return this.accountService.updatePayment(user, dto);
  }

  @Auth(Role.BUYER, Role.FARMER)
  @Patch("me/notifications")
  updateNotifications(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpdateNotificationPreferencesDto) {
    return this.accountService.updateNotifications(user, dto);
  }

  @Auth(Role.BUYER, Role.FARMER)
  @Patch("me/password")
  changePassword(@CurrentUser() user: AuthenticatedUser, @Body() dto: ChangePasswordDto) {
    return this.accountService.changePassword(user, dto);
  }
}
