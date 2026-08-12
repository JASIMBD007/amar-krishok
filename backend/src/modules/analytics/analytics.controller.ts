import { Body, Controller, Get, HttpCode, Logger, Post, Query, Req } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { ApiTags } from "@nestjs/swagger";
import { Role } from "@prisma/client";
import type { Request } from "express";
import { Auth } from "../auth/decorators/auth.decorator";
import { AnalyticsService } from "./analytics.service";
import { clientIpFrom } from "./geo.service";
import { RecordPageViewDto } from "./dto/page-view.dto";

@ApiTags("analytics")
@Controller("analytics")
export class AnalyticsController {
  private readonly logger = new Logger(AnalyticsController.name);

  constructor(private readonly analytics: AnalyticsService) {}

  /**
   * Public, because the visitors worth counting are the ones who have not signed in.
   *
   * Always answers 204, even when recording fails. The browser sends this with sendBeacon during
   * navigation and nothing on the page depends on the reply, so an error would be noise at best
   * and a delay on a slow connection at worst.
   */
  @Throttle({ default: { limit: 120, ttl: 60_000 } })
  @Post("pageview")
  @HttpCode(204)
  async record(@Body() dto: RecordPageViewDto, @Req() request: Request) {
    try {
      await this.analytics.record({
        ip: clientIpFrom(request.headers, request.socket?.remoteAddress),
        path: dto.path,
        referrer: dto.referrer,
        userAgent: request.headers["user-agent"],
      });
    } catch (error) {
      this.logger.warn(`Could not record a page view: ${error instanceof Error ? error.message : error}`);
    }
  }

  @Auth(Role.ADMIN)
  @Get("summary")
  summary(@Query("days") days?: string) {
    return this.analytics.summary(Number(days) || undefined);
  }
}
