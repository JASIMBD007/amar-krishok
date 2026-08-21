import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AccountStatus, Role } from "@prisma/client";
import { Request } from "express";
import { JwtPayload, verify } from "jsonwebtoken";
import { PrismaService } from "../../prisma/prisma.service";
import { requireJwtSecret, tokenVersionMatches } from "../jwt-secret";
import { AuthenticatedUser } from "../types/authenticated-user";

type RequestWithUser = Request & {
  user?: AuthenticatedUser;
};

function tokenPayload(value: string | JwtPayload): JwtPayload {
  if (typeof value === "string") {
    throw new UnauthorizedException("Invalid access token.");
  }

  return value;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const authorization = request.headers.authorization;

    if (!authorization) {
      throw new UnauthorizedException("Missing authorization header.");
    }

    const [scheme, token] = authorization.split(" ");
    if (scheme !== "Bearer" || !token) {
      throw new UnauthorizedException("Authorization header must use Bearer token.");
    }

    const secret = requireJwtSecret(this.config);
    let payload: JwtPayload;
    try {
      payload = tokenPayload(verify(token, secret, { algorithms: ["HS256"] }));
    } catch {
      throw new UnauthorizedException("Invalid or expired access token.");
    }

    if (typeof payload.sub !== "string" || typeof payload.role !== "string") {
      throw new UnauthorizedException("Invalid access token payload.");
    }

    const user = await this.prisma.legacyUser.findUnique({ where: { id: payload.sub } });
    if (!user || user.role !== payload.role) {
      throw new UnauthorizedException("Invalid access token user.");
    }

    if (!tokenVersionMatches(payload, user)) {
      throw new UnauthorizedException("This session ended when the password changed. Please log in again.");
    }

    if (user.role !== Role.ADMIN && user.status !== AccountStatus.ACTIVE) {
      throw new UnauthorizedException("Account is waiting for admin verification.");
    }

    request.user = {
      id: user.id,
      name: user.name,
      phone: user.phone,
      role: user.role,
      status: user.status,
      username: user.username,
    };

    return true;
  }
}
