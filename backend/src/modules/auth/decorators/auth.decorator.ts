import { applyDecorators, SetMetadata, UseGuards } from "@nestjs/common";
import { ApiBearerAuth } from "@nestjs/swagger";
import { Role } from "@prisma/client";
import { JwtAuthGuard } from "../guards/jwt-auth.guard";
import { RolesGuard } from "../guards/roles.guard";

export const ROLES_KEY = "allowed_roles";

export function Auth(...roles: Role[]) {
  return applyDecorators(SetMetadata(ROLES_KEY, roles), UseGuards(JwtAuthGuard, RolesGuard), ApiBearerAuth());
}
