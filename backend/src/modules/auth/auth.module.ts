import { Global, Module } from "@nestjs/common";
import { NotificationsModule } from "../notifications/notifications.module";
import { AdminBootstrapService } from "./admin-bootstrap.service";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import { RolesGuard } from "./guards/roles.guard";

@Global()
@Module({
  controllers: [AuthController],
  exports: [AuthService, JwtAuthGuard, RolesGuard],
  imports: [NotificationsModule],
  providers: [AdminBootstrapService, AuthService, JwtAuthGuard, RolesGuard],
})
export class AuthModule {}
