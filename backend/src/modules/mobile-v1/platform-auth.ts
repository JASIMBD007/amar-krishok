import { CanActivate, createParamDecorator, ExecutionContext, ForbiddenException, Injectable, SetMetadata, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Reflector } from "@nestjs/core";
import { PlatformRole, PlatformUserStatus } from "@prisma/client";
import { Request } from "express";
import { JwtPayload, verify } from "jsonwebtoken";

import { PrismaService } from "../prisma/prisma.service";
import { requireJwtSecret } from "../auth/jwt-secret";

export type PlatformAuthenticatedUser = {
  id: string;
  name: string;
  phone: string;
  role: PlatformRole;
  status: PlatformUserStatus;
};

type PlatformRequest = Request & { platformUser?: PlatformAuthenticatedUser };

export const CurrentPlatformUser = createParamDecorator((_data: unknown, context: ExecutionContext) =>
  context.switchToHttp().getRequest<PlatformRequest>().platformUser,
);

const PLATFORM_ROLES_KEY = "platform-roles";
export const PlatformRoles = (...roles: PlatformRole[]) => SetMetadata(PLATFORM_ROLES_KEY, roles);

function forbiddenRole(): ForbiddenException {
  return new ForbiddenException({
    error: {
      code: "FORBIDDEN_ROLE",
      message: "This account role cannot perform that action.",
      messageBn: "এই অ্যাকাউন্টের ভূমিকা দিয়ে কাজটি করা যাবে না।",
    },
  });
}

@Injectable()
export class PlatformJwtGuard implements CanActivate {
  constructor(private readonly config: ConfigService, private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<PlatformRequest>();
    const authorization = request.headers.authorization;
    const token = authorization?.startsWith("Bearer ") ? authorization.slice(7) : null;
    if (!token) throw new UnauthorizedException("Missing platform access token.");

    let payload: JwtPayload;
    try {
      const decoded = verify(token, requireJwtSecret(this.config), { algorithms: ["HS256"] });
      if (typeof decoded === "string") throw new Error("invalid token");
      payload = decoded;
    } catch {
      throw new UnauthorizedException("Invalid or expired platform access token.");
    }
    if (payload.platform !== true || typeof payload.sub !== "string" || typeof payload.role !== "string") {
      throw new UnauthorizedException("Invalid platform access token payload.");
    }
    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || user.role !== payload.role || user.status !== PlatformUserStatus.ACTIVE || payload.version !== user.tokenVersion) {
      throw new UnauthorizedException("Invalid platform user.");
    }
    request.platformUser = { id: user.id, name: user.name, phone: user.phone, role: user.role, status: user.status };
    return true;
  }
}

@Injectable()
export class PlatformRolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext) {
    const roles = this.reflector.getAllAndOverride<PlatformRole[]>(PLATFORM_ROLES_KEY, [context.getHandler(), context.getClass()]);
    if (!roles?.length) return true;
    const request = context.switchToHttp().getRequest<PlatformRequest>();
    if (!request.platformUser || !roles.includes(request.platformUser.role)) throw forbiddenRole();
    return true;
  }
}
