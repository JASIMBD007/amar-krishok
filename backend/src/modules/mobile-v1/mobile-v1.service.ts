import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { EscrowState, KycDocumentKind, ListingGrade, ListingStatus, NotificationCategory, OfferStatus, OrderStage, PlatformRole, Prisma } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { compare, hash } from "bcryptjs";

import { PrismaService } from "../prisma/prisma.service";
import type { PlatformAuthenticatedUser } from "./platform-auth";

function integer(value: unknown, field: string) {
  if (!Number.isSafeInteger(value) || Number(value) < 0) throw new BadRequestException(`${field} must be a non-negative integer.`);
  return Number(value);
}

function listingData(listing: Prisma.ListingGetPayload<{ include: { crop: true; district: true; farmer: { include: { kycProfile: true } }; photos: true } }>) {
  return {
    cropBn: listing.crop.nameBn,
    cropEn: listing.crop.nameEn,
    districtBn: listing.district.nameBn,
    farmer: listing.farmer.name,
    grade: listing.grade,
    id: listing.id,
    photo: listing.photos.sort((a, b) => a.position - b.position)[0]?.objectKey,
    pickup: listing.pickupWindow,
    pricePoisha: listing.price,
    quantityMon: listing.quantity,
    status: listing.status,
    verified: listing.farmer.kycProfile?.status === "VERIFIED",
  };
}

@Injectable()
export class MobileV1Service {
  constructor(private readonly config: ConfigService, private readonly prisma: PrismaService) {}

  async me(user: PlatformAuthenticatedUser) {
    const found = await this.prisma.user.findUnique({ where: { id: user.id }, include: { district: true, kycProfile: true } });
    if (!found) throw new NotFoundException("User not found.");
    return { avatarUrl: found.avatarUrl, district: found.district.nameBn, email: found.email, id: found.id, kycStatus: found.kycProfile?.status ?? "NONE", name: found.name, phone: found.phone, role: found.role, status: found.status, verified: found.kycProfile?.status === "VERIFIED" };
  }

  async updateMe(user: PlatformAuthenticatedUser, body: { district?: string; email?: string; name?: string; upazila?: string }) {
    const district = body.district ? await this.prisma.district.findFirst({ where: { OR: [{ id: body.district }, { nameBn: body.district }, { nameEn: body.district }] } }) : null;
    await this.prisma.user.update({ where: { id: user.id }, data: { districtId: district?.id, email: body.email?.trim(), name: body.name?.trim(), upazila: body.upazila?.trim() } });
    return this.me(user);
  }

  async updatePin(user: PlatformAuthenticatedUser, body: { currentPin: string; newPin: string }) {
    if (!/^\d{4}$/.test(body.newPin)) throw new BadRequestException("New PIN must contain four digits.");
    const account = await this.prisma.user.findUnique({ where: { id: user.id } });
    if (!account || !await compare(body.currentPin, account.pinHash)) throw new ForbiddenException("Current PIN is incorrect.");
    await this.prisma.user.update({ where: { id: user.id }, data: { pinHash: await hash(body.newPin, 12) } });
    return { updated: true };
  }

  async setAvatar(user: PlatformAuthenticatedUser, objectKey: string) { if (!objectKey.trim()) throw new BadRequestException("Avatar object key is required."); await this.prisma.user.update({ where: { id: user.id }, data: { avatarUrl: objectKey } }); return { objectKey }; }
  notificationPrefs(user: PlatformAuthenticatedUser) { return this.prisma.notificationPref.upsert({ where: { userId: user.id }, update: {}, create: { userId: user.id } }); }
  updateNotificationPrefs(user: PlatformAuthenticatedUser, body: { appAll?: boolean; smsOrders?: boolean; smsRates?: boolean; weeklyDigest?: boolean }) { return this.prisma.notificationPref.upsert({ where: { userId: user.id }, update: body, create: { ...body, userId: user.id } }); }
  payoutAccount(user: PlatformAuthenticatedUser) { return this.prisma.payoutAccount.findUnique({ where: { userId: user.id } }); }
  setPayoutAccount(user: PlatformAuthenticatedUser, body: { accountNo: string; method: "BKASH" | "NAGAD" | "BANK" }) { if (!body.accountNo.trim()) throw new BadRequestException("Account number is required."); return this.prisma.payoutAccount.upsert({ where: { userId: user.id }, update: { accountNo: body.accountNo, method: body.method, verifiedAt: null }, create: { accountNo: body.accountNo, method: body.method, userId: user.id } }); }

  crops() { return this.prisma.crop.findMany({ where: { active: true }, orderBy: { nameEn: "asc" } }); }
  districts() { return this.prisma.district.findMany({ where: { active: true }, orderBy: { nameEn: "asc" } }); }

  rates(query: { crop?: string; date?: string; district?: string }) {
    return this.prisma.marketRate.findMany({ where: { cropId: query.crop, districtId: query.district, date: query.date ? new Date(query.date) : undefined }, include: { crop: true, district: true }, orderBy: { date: "desc" }, take: 100 });
  }

  rateHistory(query: { crop: string; days?: string; district: string }) {
    const days = Math.min(90, Math.max(1, Number(query.days) || 30));
    const since = new Date();
    since.setUTCDate(since.getUTCDate() - days);
    return this.prisma.marketRate.findMany({ where: { cropId: query.crop, districtId: query.district, date: { gte: since } }, orderBy: { date: "asc" } });
  }

  async listings(query: { crop?: string; district?: string; grade?: ListingGrade; maxPrice?: string; q?: string; sort?: string; verifiedOnly?: string }) {
    const rows = await this.prisma.listing.findMany({
      where: {
        cropId: query.crop,
        districtId: query.district,
        grade: query.grade,
        price: query.maxPrice ? { lte: Number(query.maxPrice) } : undefined,
        status: ListingStatus.LIVE,
        OR: query.q ? [{ crop: { nameBn: { contains: query.q, mode: "insensitive" } } }, { crop: { nameEn: { contains: query.q, mode: "insensitive" } } }, { district: { nameBn: { contains: query.q, mode: "insensitive" } } }, { farmer: { name: { contains: query.q, mode: "insensitive" } } }] : undefined,
        farmer: query.verifiedOnly === "true" ? { kycProfile: { status: "VERIFIED" } } : undefined,
      },
      include: { crop: true, district: true, farmer: { include: { kycProfile: true } }, photos: true },
      orderBy: query.sort === "price_desc" ? { price: "desc" } : { price: "asc" },
      take: 50,
    });
    return rows.map(listingData);
  }

  async listing(id: string) {
    const row = await this.prisma.listing.findUnique({ where: { id }, include: { crop: true, district: true, farmer: { include: { kycProfile: true } }, photos: true } });
    if (!row || row.status !== ListingStatus.LIVE) throw new NotFoundException("Listing not found.");
    return listingData(row);
  }

  async createListing(user: PlatformAuthenticatedUser, body: { cropId: string; districtId: string; grade: ListingGrade; note?: string; pickupWindow: string; pricePoisha: number; quantityMon: number }) {
    return this.prisma.listing.create({ data: { cropId: body.cropId, districtId: body.districtId, farmerId: user.id, grade: body.grade, note: body.note, pickupWindow: body.pickupWindow, price: integer(body.pricePoisha, "pricePoisha"), quantity: integer(body.quantityMon, "quantityMon") } });
  }

  async updateListing(user: PlatformAuthenticatedUser, id: string, body: { grade?: ListingGrade; note?: string; pickupWindow?: string; pricePoisha?: number; quantityMon?: number }) {
    await this.ownedListing(user, id);
    return this.prisma.listing.update({ where: { id }, data: { grade: body.grade, note: body.note, pickupWindow: body.pickupWindow, price: body.pricePoisha === undefined ? undefined : integer(body.pricePoisha, "pricePoisha"), quantity: body.quantityMon === undefined ? undefined : integer(body.quantityMon, "quantityMon") } });
  }

  async setListingStatus(user: PlatformAuthenticatedUser, id: string, status: ListingStatus) {
    const listing = await this.ownedListing(user, id);
    if (status === ListingStatus.LIVE && !await this.prisma.listingPhoto.count({ where: { listingId: id } })) throw new BadRequestException("At least one photo is required to publish.");
    if (listing.status === ListingStatus.SUSPENDED) throw new ForbiddenException("A suspended listing can only be restored by staff.");
    return this.prisma.listing.update({ where: { id }, data: { status } });
  }

  async deleteListing(user: PlatformAuthenticatedUser, id: string) {
    const listing = await this.ownedListing(user, id);
    if (listing.status === ListingStatus.SOLD) throw new ConflictException("A sold listing cannot be deleted.");
    await this.prisma.listing.delete({ where: { id } });
    return { deleted: true };
  }

  async prepareListingPhoto(user: PlatformAuthenticatedUser, id: string, body: { contentType?: string; objectKey?: string; position?: number; sizeBytes?: number }) {
    await this.ownedListing(user, id);
    if (body.objectKey) {
      if (await this.prisma.listingPhoto.count({ where: { listingId: id } }) >= 6) throw new BadRequestException("A listing can have at most six photos.");
      return this.prisma.listingPhoto.create({ data: { listingId: id, objectKey: body.objectKey, position: body.position ?? 0 } });
    }
    if (!body.contentType?.startsWith("image/") || !body.sizeBytes || body.sizeBytes > 500_000) throw new BadRequestException("A JPEG or PNG under 500 KB is required.");
    const objectBase = process.env.OBJECT_UPLOAD_BASE_URL;
    if (!objectBase) throw new ConflictException("Object upload provider is not configured.");
    const objectKey = `listings/${id}/${randomUUID()}.jpg`;
    return { fileUrl: `${objectBase}/${objectKey}`, objectKey, uploadUrl: `${objectBase}/${objectKey}` };
  }

  async deskSummary(user: PlatformAuthenticatedUser) {
    const [liveLots, offers, escrow] = await Promise.all([this.prisma.listing.count({ where: { farmerId: user.id, status: ListingStatus.LIVE } }), this.prisma.offer.count({ where: { listing: { farmerId: user.id }, status: OfferStatus.OPEN } }), this.prisma.escrow.aggregate({ _sum: { amount: true }, where: { order: { farmerId: user.id }, state: EscrowState.HELD } })]);
    return { escrowPoisha: escrow._sum.amount ?? 0, liveLots, openOffers: offers };
  }

  offers(user: PlatformAuthenticatedUser) { return this.prisma.offer.findMany({ where: { listing: { farmerId: user.id } }, include: { buyer: true, listing: { include: { crop: true } } } }); }

  async respondOffer(user: PlatformAuthenticatedUser, id: string, status: OfferStatus) {
    const offer = await this.prisma.offer.findUnique({ where: { id }, include: { listing: true } });
    if (!offer || offer.listing.farmerId !== user.id) throw new NotFoundException("Offer not found.");
    if (offer.status !== OfferStatus.OPEN) throw new ConflictException("Offer already has a response.");
    return this.prisma.offer.update({ where: { id }, data: { status } });
  }

  async createOrder(user: PlatformAuthenticatedUser, body: { listingId: string; paymentMethod?: string; quantityMon: number }, key: string) {
    return this.idempotent(user.id, "create-order", key, async () => {
      if (this.config.get("NODE_ENV") === "production" && !this.config.get("PAYMENT_PROVIDER")) throw new ConflictException("Payment provider is not configured.");
      const listing = await this.prisma.listing.findUnique({ where: { id: body.listingId } });
      if (!listing || listing.status !== ListingStatus.LIVE) throw new ConflictException({ error: { code: "LISTING_NOT_LIVE", message: "The listing is not live.", messageBn: "লটটি এখন লাইভ নেই।" } });
      const quantity = integer(body.quantityMon, "quantityMon");
      if (quantity > listing.quantity) throw new ConflictException({ error: { code: "INSUFFICIENT_QUANTITY", message: "The requested quantity is unavailable.", messageBn: "চাহিদামতো পরিমাণ পাওয়া যাচ্ছে না।" } });
      const total = quantity * listing.price;
      const code = `AK-${String(Date.now()).slice(-6)}`;
      const order = await this.prisma.$transaction(async (tx) => {
        const created = await tx.order.create({ data: { buyerId: user.id, code, farmerId: listing.farmerId, feeAmount: 0, listingId: listing.id, paymentMethod: body.paymentMethod ?? "bKash", quantity, total, unitPrice: listing.price } });
        await tx.escrow.create({ data: { amount: total, heldAt: new Date(), orderId: created.id } });
        return created;
      });
      return { orderId: order.id, orderCode: order.code };
    });
  }

  orders(user: PlatformAuthenticatedUser) { return this.prisma.order.findMany({ where: user.role === PlatformRole.BUYER ? { buyerId: user.id } : { farmerId: user.id }, include: { escrow: true, listing: { include: { crop: true, district: true } }, trip: { include: { carrier: true, stops: true } } }, orderBy: { createdAt: "desc" } }); }

  async order(user: PlatformAuthenticatedUser, id: string) {
    const row = await this.prisma.order.findFirst({ where: { id, OR: [{ buyerId: user.id }, { farmerId: user.id }] }, include: { escrow: true, listing: { include: { crop: true, district: true } }, trip: { include: { carrier: true, stops: true } } } });
    if (!row) throw new NotFoundException("Order not found.");
    return row;
  }

  async confirmDelivery(user: PlatformAuthenticatedUser, id: string, key: string) {
    return this.idempotent(user.id, `confirm-delivery:${id}`, key, async () => {
      const order = await this.prisma.order.findFirst({ where: { id, buyerId: user.id }, include: { escrow: true, trip: true } });
      if (!order?.escrow) throw new NotFoundException("Order not found.");
      if (order.escrow.state !== EscrowState.HELD) return { state: order.escrow.state };
      await this.prisma.$transaction(async (tx) => {
        await tx.escrow.update({ where: { orderId: id }, data: { releasedAt: new Date(), releasedById: user.id, state: EscrowState.RELEASED } });
        await tx.order.update({ where: { id }, data: { stage: OrderStage.PAID } });
        if (order.trip?.carrierId) await tx.carrierPayout.updateMany({ where: { tripId: order.trip.id }, data: { state: "AVAILABLE" } });
      });
      return { state: EscrowState.RELEASED };
    });
  }

  async createOffer(user: PlatformAuthenticatedUser, body: { listingId: string; pricePoisha: number; quantityMon: number }) {
    const listing = await this.prisma.listing.findUnique({ where: { id: body.listingId } });
    if (!listing || listing.status !== ListingStatus.LIVE) throw new NotFoundException("Listing not found.");
    return this.prisma.offer.create({ data: { buyerId: user.id, listingId: listing.id, price: integer(body.pricePoisha, "pricePoisha"), quantity: integer(body.quantityMon, "quantityMon") } });
  }

  async createDispute(user: PlatformAuthenticatedUser, orderId: string, subject: string) {
    const order = await this.prisma.order.findFirst({ where: { id: orderId, buyerId: user.id } });
    if (!order) throw new NotFoundException("Order not found.");
    if (!subject.trim()) throw new BadRequestException("Dispute subject is required.");
    return this.prisma.dispute.create({ data: { code: `D-${String(Date.now()).slice(-6)}`, openedById: user.id, orderId, slaDueAt: new Date(Date.now() + 24 * 60 * 60 * 1000), state: "OPEN", subject: subject.trim() } });
  }

  farmerPayouts(user: PlatformAuthenticatedUser) { return this.prisma.payout.findMany({ where: { farmerId: user.id }, orderBy: { sentAt: "desc" } }); }
  async withdrawFarmerPayout(user: PlatformAuthenticatedUser, key: string, amountPoisha: number) {
    return this.idempotent(user.id, "farmer-withdraw", key, async () => {
      const account = await this.prisma.payoutAccount.findUnique({ where: { userId: user.id } });
      if (!account) throw new BadRequestException("A payout account is required.");
      integer(amountPoisha, "amountPoisha");
      const payout = await this.prisma.payout.create({ data: { accountNo: account.accountNo, amount: amountPoisha, batchId: `REQ-${Date.now()}`, farmerId: user.id, method: account.method } });
      return { payoutId: payout.id, requested: true };
    });
  }

  notifications(user: PlatformAuthenticatedUser, category?: NotificationCategory) { return this.prisma.notification.findMany({ where: { userId: user.id, category }, orderBy: { sentAt: "desc" }, take: 50 }); }
  async markNotification(user: PlatformAuthenticatedUser, id: string, read: boolean) { await this.prisma.notification.updateMany({ where: { id, userId: user.id }, data: { readAt: read ? new Date() : null } }); return { updated: true }; }
  async markAllNotifications(user: PlatformAuthenticatedUser) { await this.prisma.notification.updateMany({ where: { userId: user.id, readAt: null }, data: { readAt: new Date() } }); return { updated: true }; }
  async unreadCount(user: PlatformAuthenticatedUser) { return { count: await this.prisma.notification.count({ where: { userId: user.id, readAt: null } }) }; }

  threads(user: PlatformAuthenticatedUser) { return this.prisma.thread.findMany({ where: { members: { some: { userId: user.id } } }, include: { messages: { orderBy: { createdAt: "desc" }, take: 1 } } }); }
  async messages(user: PlatformAuthenticatedUser, threadId: string) { await this.assertThreadMember(user.id, threadId); return this.prisma.message.findMany({ where: { threadId }, orderBy: { createdAt: "asc" }, take: 100 }); }
  async sendMessage(user: PlatformAuthenticatedUser, threadId: string, body: string) { await this.assertThreadMember(user.id, threadId); if (!body.trim()) throw new BadRequestException("Message body is required."); return this.prisma.message.create({ data: { authorId: user.id, body: body.trim(), threadId } }); }
  async createThread(user: PlatformAuthenticatedUser, body: { memberIds: string[]; orderId?: string; subject: string }) { const members = Array.from(new Set([user.id, ...body.memberIds])); return this.prisma.thread.create({ data: { kind: body.orderId ? "DIRECT" : "SUPPORT", orderId: body.orderId, subject: body.subject, members: { create: members.map((userId) => ({ lastReadAt: new Date(), userId })) } } }); }
  async readThread(user: PlatformAuthenticatedUser, threadId: string) { await this.assertThreadMember(user.id, threadId); await this.prisma.threadMember.update({ where: { threadId_userId: { threadId, userId: user.id } }, data: { lastReadAt: new Date() } }); return { updated: true }; }
  async escalateThread(user: PlatformAuthenticatedUser, threadId: string) { await this.assertThreadMember(user.id, threadId); return this.prisma.thread.update({ where: { id: threadId }, data: { escalatedAt: new Date(), kind: "SUPPORT" } }); }

  async kyc(user: PlatformAuthenticatedUser) { return this.prisma.kycProfile.findUnique({ where: { userId: user.id }, include: { user: { select: { kycDocuments: true } } } }); }
  async updateKyc(user: PlatformAuthenticatedUser, body: { khatian: string; nid: string }) { return this.prisma.kycProfile.upsert({ where: { userId: user.id }, update: { khatian: body.khatian, nid: body.nid, status: "IN_REVIEW" }, create: { khatian: body.khatian, nid: body.nid, status: "IN_REVIEW", userId: user.id } }); }
  async addKycDocument(user: PlatformAuthenticatedUser, body: { contentType?: string; kind: KycDocumentKind; objectKey?: string; sizeBytes?: number }, key: string) {
    if (!body.objectKey) {
      if (!body.contentType?.startsWith("image/") || !body.sizeBytes || body.sizeBytes > 500_000) throw new BadRequestException("A JPEG or PNG under 500 KB is required.");
      const objectBase = this.config.get<string>("OBJECT_UPLOAD_BASE_URL");
      if (!objectBase) throw new ConflictException("Object upload provider is not configured.");
      const objectKey = `kyc/${user.id}/${randomUUID()}.jpg`;
      return { fileUrl: `${objectBase}/${objectKey}`, objectKey, uploadUrl: `${objectBase}/${objectKey}` };
    }
    return this.idempotent(user.id, `kyc-document:${body.kind}`, key, () => this.prisma.kycDocument.create({ data: { kind: body.kind, objectKey: body.objectKey!, status: "IN_REVIEW", userId: user.id } }));
  }
  async deleteKycDocument(user: PlatformAuthenticatedUser, id: string) { await this.prisma.kycDocument.deleteMany({ where: { id, userId: user.id } }); return { deleted: true }; }

  async reorderPhotos(user: PlatformAuthenticatedUser, listingId: string, ids: string[]) { await this.ownedListing(user, listingId); if (ids.length > 6) throw new BadRequestException("At most six photos are allowed."); if (await this.prisma.listingPhoto.count({ where: { id: { in: ids }, listingId } }) !== ids.length) throw new ForbiddenException("A photo does not belong to this listing."); await this.prisma.$transaction(ids.map((id, position) => this.prisma.listingPhoto.update({ where: { id }, data: { position } }))); return { updated: true }; }
  async deletePhoto(user: PlatformAuthenticatedUser, listingId: string, photoId: string) { await this.ownedListing(user, listingId); await this.prisma.listingPhoto.deleteMany({ where: { id: photoId, listingId } }); return { deleted: true }; }

  private async ownedListing(user: PlatformAuthenticatedUser, id: string) {
    const listing = await this.prisma.listing.findFirst({ where: { id, farmerId: user.id } });
    if (!listing) throw new NotFoundException("Listing not found.");
    return listing;
  }

  private async assertThreadMember(userId: string, threadId: string) {
    if (!await this.prisma.threadMember.findUnique({ where: { threadId_userId: { threadId, userId } } })) throw new NotFoundException("Thread not found.");
  }

  private async idempotent<T extends object>(userId: string, scope: string, key: string, operation: () => Promise<T>): Promise<T> {
    if (!key) throw new BadRequestException({ error: { code: "IDEMPOTENCY_KEY_REQUIRED", message: "Idempotency-Key is required.", messageBn: "Idempotency-Key আবশ্যক।" } });
    const existing = await this.prisma.idempotencyRecord.findUnique({ where: { userId_scope_key: { key, scope, userId } } });
    if (existing) return existing.response as T;
    const result = await operation();
    try { await this.prisma.idempotencyRecord.create({ data: { key, response: result as Prisma.InputJsonValue, scope, userId } }); } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")) throw error;
    }
    return result;
  }
}
