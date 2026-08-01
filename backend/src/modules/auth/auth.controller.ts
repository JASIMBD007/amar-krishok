import { Body, Controller, Post } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { AuthService } from "./auth.service";
import { LoginDto, PasswordResetConfirmDto, PasswordResetLookupDto, RegisterAccountDto } from "./dto/register-account.dto";

const BRUTE_FORCE_SENSITIVE_LIMIT = { default: { limit: 10, ttl: 60_000 } };

@ApiTags("auth")
@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Throttle(BRUTE_FORCE_SENSITIVE_LIMIT)
  @Post("register/buyer")
  registerBuyer(@Body() dto: RegisterAccountDto) {
    return this.authService.registerBuyer(dto);
  }

  @Throttle(BRUTE_FORCE_SENSITIVE_LIMIT)
  @Post("register/farmer")
  registerFarmer(@Body() dto: RegisterAccountDto) {
    return this.authService.registerFarmer(dto);
  }

  @Throttle(BRUTE_FORCE_SENSITIVE_LIMIT)
  @Post("login")
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Throttle(BRUTE_FORCE_SENSITIVE_LIMIT)
  @Post("password-reset/lookup")
  lookupPasswordResetAccount(@Body() dto: PasswordResetLookupDto) {
    return this.authService.lookupPasswordResetAccount(dto);
  }

  @Throttle(BRUTE_FORCE_SENSITIVE_LIMIT)
  @Post("password-reset/request")
  requestPasswordReset(@Body() dto: PasswordResetConfirmDto) {
    return this.authService.resetPassword(dto);
  }

  @Throttle(BRUTE_FORCE_SENSITIVE_LIMIT)
  @Post("password-reset/confirm")
  resetPassword(@Body() dto: PasswordResetConfirmDto) {
    return this.authService.resetPassword(dto);
  }
}
