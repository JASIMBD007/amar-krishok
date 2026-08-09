import { Body, Controller, Delete, Get, Headers, Param, Patch, Post, Put, Query, UseGuards } from "@nestjs/common";
import { KycDocumentKind, ListingGrade, ListingStatus, NotificationCategory, OfferStatus, PlatformRole } from "@prisma/client";

import { CurrentPlatformUser, PlatformAuthenticatedUser, PlatformJwtGuard, PlatformRoles, PlatformRolesGuard } from "./platform-auth";
import { MobileV1Service } from "./mobile-v1.service";

function envelope<T>(data: T, meta?: Record<string, unknown>) { return meta ? { data, meta } : { data }; }

@Controller("v1")
export class MobilePublicController {
  constructor(private readonly service: MobileV1Service) {}
  @Get("crops") async crops() { return envelope(await this.service.crops()); }
  @Get("districts") async districts() { return envelope(await this.service.districts()); }
  @Get("rates/history") async rateHistory(@Query() query: { crop: string; days?: string; district: string }) { return envelope(await this.service.rateHistory(query)); }
  @Get("rates") async rates(@Query() query: { crop?: string; date?: string; district?: string }) { return envelope(await this.service.rates(query)); }
  @Get("listings") async listings(@Query() query: { crop?: string; district?: string; grade?: ListingGrade; maxPrice?: string; q?: string; sort?: string; verifiedOnly?: string }) { const data = await this.service.listings(query); return envelope(data, { count: data.length }); }
  @Get("listings/:id") async listing(@Param("id") id: string) { return envelope(await this.service.listing(id)); }
}

@UseGuards(PlatformJwtGuard, PlatformRolesGuard)
@PlatformRoles(PlatformRole.FARMER, PlatformRole.BUYER, PlatformRole.CARRIER)
@Controller("v1")
export class MobileSharedController {
  constructor(private readonly service: MobileV1Service) {}

  @Get("me") async me(@CurrentPlatformUser() user: PlatformAuthenticatedUser) { return envelope(await this.service.me(user)); }
  @Patch("me") async updateMe(@CurrentPlatformUser() user: PlatformAuthenticatedUser, @Body() body: { district?: string; email?: string; name?: string; upazila?: string }) { return envelope(await this.service.updateMe(user, body)); }
  @Patch("me/pin") async updatePin(@CurrentPlatformUser() user: PlatformAuthenticatedUser, @Body() body: { currentPin: string; newPin: string }) { return envelope(await this.service.updatePin(user, body)); }
  @Post("me/avatar") async avatar(@CurrentPlatformUser() user: PlatformAuthenticatedUser, @Body("objectKey") objectKey: string) { return envelope(await this.service.setAvatar(user, objectKey)); }
  @Get("me/notification-prefs") async prefs(@CurrentPlatformUser() user: PlatformAuthenticatedUser) { return envelope(await this.service.notificationPrefs(user)); }
  @Patch("me/notification-prefs") async updatePrefs(@CurrentPlatformUser() user: PlatformAuthenticatedUser, @Body() body: { appAll?: boolean; smsOrders?: boolean; smsRates?: boolean; weeklyDigest?: boolean }) { return envelope(await this.service.updateNotificationPrefs(user, body)); }
  @Get("me/payout-account") async payoutAccount(@CurrentPlatformUser() user: PlatformAuthenticatedUser) { return envelope(await this.service.payoutAccount(user)); }
  @Put("me/payout-account") async setPayoutAccount(@CurrentPlatformUser() user: PlatformAuthenticatedUser, @Body() body: { accountNo: string; method: "BKASH" | "NAGAD" | "BANK" }) { return envelope(await this.service.setPayoutAccount(user, body)); }
  @Get("me/kyc") async kyc(@CurrentPlatformUser() user: PlatformAuthenticatedUser) { return envelope(await this.service.kyc(user)); }
  @Patch("me/kyc") async updateKyc(@CurrentPlatformUser() user: PlatformAuthenticatedUser, @Body() body: { khatian: string; nid: string }) { return envelope(await this.service.updateKyc(user, body)); }
  @Post("me/kyc/documents") async addKycDocument(@CurrentPlatformUser() user: PlatformAuthenticatedUser, @Headers("idempotency-key") key = "", @Body() body: { contentType?: string; kind: KycDocumentKind; objectKey?: string; sizeBytes?: number }) { return envelope(await this.service.addKycDocument(user, body, key)); }
  @Delete("me/kyc/documents/:id") async deleteKycDocument(@CurrentPlatformUser() user: PlatformAuthenticatedUser, @Param("id") id: string) { return envelope(await this.service.deleteKycDocument(user, id)); }

  @Get("notifications") async notifications(@CurrentPlatformUser() user: PlatformAuthenticatedUser, @Query("category") category?: NotificationCategory) { return envelope(await this.service.notifications(user, category)); }
  @Post("notifications/:id/read") async markRead(@CurrentPlatformUser() user: PlatformAuthenticatedUser, @Param("id") id: string) { return envelope(await this.service.markNotification(user, id, true)); }
  @Post("notifications/:id/unread") async markUnread(@CurrentPlatformUser() user: PlatformAuthenticatedUser, @Param("id") id: string) { return envelope(await this.service.markNotification(user, id, false)); }
  @Post("notifications/read-all") async markAllRead(@CurrentPlatformUser() user: PlatformAuthenticatedUser) { return envelope(await this.service.markAllNotifications(user)); }
  @Get("notifications/unread-count") async unreadCount(@CurrentPlatformUser() user: PlatformAuthenticatedUser) { return envelope(await this.service.unreadCount(user)); }

  @Get("threads") async threads(@CurrentPlatformUser() user: PlatformAuthenticatedUser) { return envelope(await this.service.threads(user)); }
  @Post("threads") async createThread(@CurrentPlatformUser() user: PlatformAuthenticatedUser, @Body() body: { memberIds: string[]; orderId?: string; subject: string }) { return envelope(await this.service.createThread(user, body)); }
  @Get("threads/:id/messages") async messages(@CurrentPlatformUser() user: PlatformAuthenticatedUser, @Param("id") id: string) { return envelope(await this.service.messages(user, id)); }
  @Post("threads/:id/messages") async sendMessage(@CurrentPlatformUser() user: PlatformAuthenticatedUser, @Param("id") id: string, @Body("body") body: string) { return envelope(await this.service.sendMessage(user, id, body)); }
  @Post("threads/:id/read") async readThread(@CurrentPlatformUser() user: PlatformAuthenticatedUser, @Param("id") id: string) { return envelope(await this.service.readThread(user, id)); }
  @Post("threads/:id/escalate") async escalateThread(@CurrentPlatformUser() user: PlatformAuthenticatedUser, @Param("id") id: string) { return envelope(await this.service.escalateThread(user, id)); }

}

@UseGuards(PlatformJwtGuard, PlatformRolesGuard)
@PlatformRoles(PlatformRole.FARMER)
@Controller("v1")
export class MobileFarmerController {
  constructor(private readonly service: MobileV1Service) {}
  @Post("listings") async create(@CurrentPlatformUser() user: PlatformAuthenticatedUser, @Body() body: { cropId: string; districtId: string; grade: ListingGrade; note?: string; pickupWindow: string; pricePoisha: number; quantityMon: number }) { return envelope(await this.service.createListing(user, body)); }
  @Patch("listings/:id") async update(@CurrentPlatformUser() user: PlatformAuthenticatedUser, @Param("id") id: string, @Body() body: { grade?: ListingGrade; note?: string; pickupWindow?: string; pricePoisha?: number; quantityMon?: number }) { return envelope(await this.service.updateListing(user, id, body)); }
  @Post("listings/:id/pause") async pause(@CurrentPlatformUser() user: PlatformAuthenticatedUser, @Param("id") id: string) { return envelope(await this.service.setListingStatus(user, id, ListingStatus.PAUSED)); }
  @Post("listings/:id/publish") async publish(@CurrentPlatformUser() user: PlatformAuthenticatedUser, @Param("id") id: string) { return envelope(await this.service.setListingStatus(user, id, ListingStatus.LIVE)); }
  @Delete("listings/:id") async remove(@CurrentPlatformUser() user: PlatformAuthenticatedUser, @Param("id") id: string) { return envelope(await this.service.deleteListing(user, id)); }
  @Post("listings/:id/photos") async photo(@CurrentPlatformUser() user: PlatformAuthenticatedUser, @Param("id") id: string, @Body() body: { contentType?: string; objectKey?: string; position?: number; sizeBytes?: number }) { return envelope(await this.service.prepareListingPhoto(user, id, body)); }
  @Patch("listings/:id/photos/order") async photoOrder(@CurrentPlatformUser() user: PlatformAuthenticatedUser, @Param("id") id: string, @Body("ids") ids: string[]) { return envelope(await this.service.reorderPhotos(user, id, ids)); }
  @Delete("listings/:id/photos/:photoId") async deletePhoto(@CurrentPlatformUser() user: PlatformAuthenticatedUser, @Param("id") id: string, @Param("photoId") photoId: string) { return envelope(await this.service.deletePhoto(user, id, photoId)); }
  @Get("desk/summary") async summary(@CurrentPlatformUser() user: PlatformAuthenticatedUser) { return envelope(await this.service.deskSummary(user)); }
  @Get("desk/offers") async offers(@CurrentPlatformUser() user: PlatformAuthenticatedUser) { return envelope(await this.service.offers(user)); }
  @Post("offers/:id/accept") async accept(@CurrentPlatformUser() user: PlatformAuthenticatedUser, @Param("id") id: string) { return envelope(await this.service.respondOffer(user, id, OfferStatus.ACCEPTED)); }
  @Post("offers/:id/decline") async decline(@CurrentPlatformUser() user: PlatformAuthenticatedUser, @Param("id") id: string) { return envelope(await this.service.respondOffer(user, id, OfferStatus.DECLINED)); }
  @Get("orders") async orders(@CurrentPlatformUser() user: PlatformAuthenticatedUser) { return envelope(await this.service.orders(user)); }
  @Get("orders/:id") async order(@CurrentPlatformUser() user: PlatformAuthenticatedUser, @Param("id") id: string) { return envelope(await this.service.order(user, id)); }
  @Get("payouts") async payouts(@CurrentPlatformUser() user: PlatformAuthenticatedUser) { return envelope(await this.service.farmerPayouts(user)); }
  @Post("payouts/withdraw") async withdraw(@CurrentPlatformUser() user: PlatformAuthenticatedUser, @Headers("idempotency-key") key = "", @Body("amountPoisha") amountPoisha: number) { return envelope(await this.service.withdrawFarmerPayout(user, key, amountPoisha)); }
}

@UseGuards(PlatformJwtGuard, PlatformRolesGuard)
@PlatformRoles(PlatformRole.BUYER)
@Controller("v1")
export class MobileBuyerController {
  constructor(private readonly service: MobileV1Service) {}
  @Post("orders") async createOrder(@CurrentPlatformUser() user: PlatformAuthenticatedUser, @Body() body: { listingId: string; paymentMethod?: string; quantityMon: number }, @Headers("idempotency-key") key = "") { return envelope(await this.service.createOrder(user, body, key)); }
  @Post("orders/:id/confirm-delivery") async confirm(@CurrentPlatformUser() user: PlatformAuthenticatedUser, @Param("id") id: string, @Headers("idempotency-key") key = "") { return envelope(await this.service.confirmDelivery(user, id, key)); }
  @Post("orders/:id/dispute") async dispute(@CurrentPlatformUser() user: PlatformAuthenticatedUser, @Param("id") id: string, @Body("subject") subject: string) { return envelope(await this.service.createDispute(user, id, subject)); }
  @Post("offers") async offer(@CurrentPlatformUser() user: PlatformAuthenticatedUser, @Body() body: { listingId: string; pricePoisha: number; quantityMon: number }) { return envelope(await this.service.createOffer(user, body)); }
  @Get("orders") async orders(@CurrentPlatformUser() user: PlatformAuthenticatedUser) { return envelope(await this.service.orders(user)); }
  @Get("orders/:id") async order(@CurrentPlatformUser() user: PlatformAuthenticatedUser, @Param("id") id: string) { return envelope(await this.service.order(user, id)); }
}
