import { Body, Controller, Get, Headers, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { PlatformRole } from "@prisma/client";

import { CarrierService } from "./carrier.service";
import { CurrentPlatformUser, PlatformAuthenticatedUser, PlatformJwtGuard, PlatformRoles, PlatformRolesGuard } from "./platform-auth";

function envelope<T>(data: T) { return { data }; }

@UseGuards(PlatformJwtGuard, PlatformRolesGuard)
@PlatformRoles(PlatformRole.CARRIER)
@Controller("v1/carrier")
export class CarrierController {
  constructor(private readonly service: CarrierService) {}
  @Get("trips") async trips(@CurrentPlatformUser() user: PlatformAuthenticatedUser, @Query("scope") scope?: string) { return envelope(await this.service.trips(user, scope)); }
  @Get("trips/:id") async trip(@CurrentPlatformUser() user: PlatformAuthenticatedUser, @Param("id") id: string) { return envelope(await this.service.trip(user, id)); }
  @Post("trips/:id/accept") async accept(@CurrentPlatformUser() user: PlatformAuthenticatedUser, @Param("id") id: string) { return envelope(await this.service.accept(user, id, true)); }
  @Post("trips/:id/decline") async decline(@CurrentPlatformUser() user: PlatformAuthenticatedUser, @Param("id") id: string) { return envelope(await this.service.accept(user, id, false)); }
  @Post("trips/:id/start") async start(@CurrentPlatformUser() user: PlatformAuthenticatedUser, @Param("id") id: string) { return envelope(await this.service.transition(user, id, "start")); }
  @Post("trips/:id/arrive") async arrive(@CurrentPlatformUser() user: PlatformAuthenticatedUser, @Param("id") id: string) { return envelope(await this.service.transition(user, id, "arrive")); }
  @Post("trips/:id/proof") async proof(@CurrentPlatformUser() user: PlatformAuthenticatedUser, @Param("id") id: string, @Headers("idempotency-key") key = "", @Body() body: Parameters<CarrierService["proof"]>[3]) { return envelope(await this.service.proof(user, id, key, body)); }
  @Post("trips/:id/location") async location(@CurrentPlatformUser() user: PlatformAuthenticatedUser, @Param("id") id: string, @Body() body: { at: string; lat: number; lng: number }) { return envelope(await this.service.location(user, id, body)); }
  @Get("jobs") async jobs(@CurrentPlatformUser() user: PlatformAuthenticatedUser, @Query() query: { district?: string; minMon?: string; sort?: string }) { return envelope(await this.service.jobs(user, query)); }
  @Post("jobs/:tripId/bid") async bid(@CurrentPlatformUser() user: PlatformAuthenticatedUser, @Param("tripId") tripId: string, @Body("amountPoisha") amountPoisha: number) { return envelope(await this.service.bid(user, tripId, amountPoisha)); }
  @Get("earnings") async earnings(@CurrentPlatformUser() user: PlatformAuthenticatedUser) { return envelope(await this.service.earnings(user)); }
  @Post("withdraw") async withdraw(@CurrentPlatformUser() user: PlatformAuthenticatedUser, @Headers("idempotency-key") key = "", @Body("amountPoisha") amountPoisha: number) { return envelope(await this.service.withdraw(user, key, amountPoisha)); }
  @Patch("online") async online(@CurrentPlatformUser() user: PlatformAuthenticatedUser, @Body("online") online: boolean) { return envelope(await this.service.online(user, online)); }
}
