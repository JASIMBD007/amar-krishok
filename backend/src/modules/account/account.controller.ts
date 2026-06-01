import { Body, Controller, Get, Patch } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Role } from "@prisma/client";
import { Auth } from "../auth/decorators/auth.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { AuthenticatedUser } from "../auth/types/authenticated-user";
import { AccountService } from "./account.service";
import { UpdateProfileDto } from "./dto/update-profile.dto";

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
}
