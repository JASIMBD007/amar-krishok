import { Body, Controller, Delete, Get, Headers, Param, Post, Res, UseGuards } from "@nestjs/common";
import { Response } from "express";

import { PrismaService } from "../prisma/prisma.service";
import { MobileAuthService } from "./mobile-auth.service";
import { CurrentPlatformUser, PlatformAuthenticatedUser, PlatformJwtGuard, PlatformRolesGuard } from "./platform-auth";

function envelope<T>(data: T) { return { data }; }

@Controller("v1/auth")
export class MobileAuthController {
  constructor(private readonly auth: MobileAuthService, private readonly prisma: PrismaService) {}

  @Post("login")
  async login(@Body() body: Parameters<MobileAuthService["loginWithPassword"]>[0], @Res({ passthrough: true }) response: Response) {
    const result = await this.auth.loginWithPassword(body);
    response.cookie("ak_refresh", result.refreshToken, { httpOnly: true, maxAge: 30 * 24 * 60 * 60 * 1000, sameSite: "strict", secure: process.env.NODE_ENV === "production" });
    return envelope(result);
  }

  @Post("register")
  async register(@Body() body: Parameters<MobileAuthService["register"]>[0]) {
    return envelope(await this.auth.register(body));
  }

  @Post("refresh")
  async refresh(@Body() body: { refreshToken?: string }, @Headers("cookie") cookieHeader: string | undefined, @Res({ passthrough: true }) response: Response) {
    const cookieToken = cookieHeader?.split(";").map((part) => part.trim()).find((part) => part.startsWith("ak_refresh="))?.slice("ak_refresh=".length);
    const result = await this.auth.refresh(body.refreshToken ?? cookieToken);
    response.cookie("ak_refresh", result.refreshToken, { httpOnly: true, maxAge: 30 * 24 * 60 * 60 * 1000, sameSite: "strict", secure: process.env.NODE_ENV === "production" });
    return envelope(result);
  }

  @UseGuards(PlatformJwtGuard, PlatformRolesGuard)
  @Post("logout")
  async logout(@CurrentPlatformUser() user: PlatformAuthenticatedUser, @Res({ passthrough: true }) response: Response) {
    response.clearCookie("ak_refresh");
    return envelope(await this.auth.logout(user.id));
  }

  @UseGuards(PlatformJwtGuard, PlatformRolesGuard)
  @Get("devices")
  async devices(@CurrentPlatformUser() user: PlatformAuthenticatedUser) {
    return envelope(await this.prisma.device.findMany({ where: { userId: user.id }, orderBy: { lastSeenAt: "desc" } }));
  }

  @UseGuards(PlatformJwtGuard, PlatformRolesGuard)
  @Delete("devices/:id")
  async revokeDevice(@CurrentPlatformUser() user: PlatformAuthenticatedUser, @Param("id") id: string) {
    await this.prisma.device.updateMany({ where: { id, userId: user.id }, data: { revokedAt: new Date() } });
    return envelope({ revoked: true });
  }
}
