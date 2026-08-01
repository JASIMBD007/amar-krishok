import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AccountStatus, Role } from "@prisma/client";
import { Request } from "express";
import { verify } from "jsonwebtoken";
import { PrismaService } from "../../prisma/prisma.service";
import { requireJwtSecret } from "../jwt-secret";
import { AuthenticatedUser } from "../types/authenticated-user";

type RequestWithUser = Request & { user?: AuthenticatedUser };

/**
 * Populates request.user when a valid Bearer token is present, but never rejects the request.
 * Lets a single route serve both anonymous visitors (e.g. public marketplace images, guest chat)
 * and authenticated users whose identity must be trusted over anything the client claims.
 */
@Injectable()
export class OptionalAuthGuard implements CanActivate {
  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const authorization = request.headers.authorization;
    if (!authorization) {
      return true;
    }

    const [scheme, token] = authorization.split(" ");
    if (scheme !== "Bearer" || !token) {
      return true;
    }

    try {
      const secret = requireJwtSecret(this.config);
      const payload = verify(token, secret, { algorithms: ["HS256"] });
      if (typeof payload === "string" || typeof payload.sub !== "string" || typeof payload.role !== "string") {
        return true;
      }

      const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
      if (!user || user.role !== payload.role) {
        return true;
      }

      if (user.role !== Role.ADMIN && user.status !== AccountStatus.ACTIVE) {
        return true;
      }

      request.user = {
        id: user.id,
        name: user.name,
        phone: user.phone,
        role: user.role,
        status: user.status,
        username: user.username,
      };
    } catch {
      // Invalid or expired token: proceed as an anonymous request rather than failing the whole route.
    }

    return true;
  }
}
