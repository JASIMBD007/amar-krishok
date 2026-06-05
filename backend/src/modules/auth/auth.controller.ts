import { Body, Controller, Post } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { AuthService } from "./auth.service";
import { LoginDto, PasswordResetConfirmDto, PasswordResetLookupDto, RegisterAccountDto } from "./dto/register-account.dto";

@ApiTags("auth")
@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("register/buyer")
  registerBuyer(@Body() dto: RegisterAccountDto) {
    return this.authService.registerBuyer(dto);
  }

  @Post("register/farmer")
  registerFarmer(@Body() dto: RegisterAccountDto) {
    return this.authService.registerFarmer(dto);
  }

  @Post("login")
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post("password-reset/lookup")
  lookupPasswordResetAccount(@Body() dto: PasswordResetLookupDto) {
    return this.authService.lookupPasswordResetAccount(dto);
  }

  @Post("password-reset/confirm")
  resetPassword(@Body() dto: PasswordResetConfirmDto) {
    return this.authService.resetPassword(dto);
  }
}
