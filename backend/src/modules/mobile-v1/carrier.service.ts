import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { CarrierPayoutState, CarrierStatus, HandoverKind, Prisma, TripBidState, TripState } from "@prisma/client";

import { PrismaService } from "../prisma/prisma.service";
import type { PlatformAuthenticatedUser } from "./platform-auth";

type ProofInput = {
  capturedAt: string;
  location?: { accuracy?: number; latitude: number; longitude: number } | null;
  photoKeys?: string[];
  photoUris?: string[];
  signature: string;
  weightMon: number;
};

@Injectable()
export class CarrierService {
  constructor(private readonly config: ConfigService, private readonly prisma: PrismaService) {}

  async trips(user: PlatformAuthenticatedUser, scope = "today") {
    const carrier = await this.carrier(user.id);
    const start = new Date(); start.setUTCHours(0, 0, 0, 0);
    const end = new Date(start); end.setUTCDate(end.getUTCDate() + (scope === "upcoming" ? 14 : 1));
    return this.prisma.trip.findMany({ where: { carrierId: carrier.id, pickupAt: { gte: start, lt: end } }, select: this.safeTripSelect(), orderBy: { pickupAt: "asc" } });
  }

  async trip(user: PlatformAuthenticatedUser, id: string) {
    const carrier = await this.carrier(user.id);
    const trip = await this.prisma.trip.findFirst({ where: { id, carrierId: carrier.id }, select: this.safeTripSelect() });
    if (!trip) throw new NotFoundException("Trip not found.");
    return trip;
  }

  async accept(user: PlatformAuthenticatedUser, id: string, accepted: boolean) {
    const carrier = await this.carrier(user.id);
    const trip = await this.prisma.trip.findUnique({ where: { id } });
    if (!trip || (trip.carrierId && trip.carrierId !== carrier.id)) throw new NotFoundException("Trip not found.");
    if (trip.state !== TripState.OFFERED) throw new ConflictException("Trip is no longer offered.");
    return this.prisma.trip.update({ where: { id }, data: accepted ? { acceptedAt: new Date(), carrierId: carrier.id, state: TripState.ACCEPTED } : { state: TripState.CANCELLED } });
  }

  async transition(user: PlatformAuthenticatedUser, id: string, action: "arrive" | "start") {
    const carrier = await this.carrier(user.id);
    const trip = await this.prisma.trip.findFirst({ where: { id, carrierId: carrier.id } });
    if (!trip) throw new NotFoundException("Trip not found.");
    const next = action === "start" && trip.state === TripState.ACCEPTED ? TripState.EN_ROUTE_PICKUP : action === "start" && trip.state === TripState.PICKED_UP ? TripState.EN_ROUTE_DELIVERY : action === "arrive" && trip.state === TripState.EN_ROUTE_DELIVERY ? TripState.DELIVERED : null;
    if (!next) throw new ConflictException("Trip cannot make that transition.");
    return this.prisma.trip.update({ where: { id }, data: { state: next } });
  }

  async proof(user: PlatformAuthenticatedUser, tripId: string, key: string, input: ProofInput) {
    if (!key) throw new BadRequestException("Idempotency-Key is required.");
    const carrier = await this.carrier(user.id);
    const trip = await this.prisma.trip.findFirst({ where: { id: tripId, carrierId: carrier.id } });
    if (!trip) throw new NotFoundException("Trip not found.");
    const existing = await this.prisma.proofOfHandover.findUnique({ where: { idempotencyKey: key } });
    if (existing) {
      if (existing.tripId !== tripId) throw new ConflictException("Idempotency key belongs to a different trip.");
      return existing;
    }
    if (!Number.isFinite(input.weightMon) || input.weightMon <= 0 || !input.signature.trim()) throw new BadRequestException("Weight and signature are required.");
    const photoKeys = input.photoKeys?.length ? input.photoKeys : input.photoUris;
    if (!photoKeys?.length) throw new BadRequestException("At least one proof photo is required.");
    if (photoKeys.length > 6) throw new BadRequestException("At most six proof photos are allowed.");
    if (this.config.get("NODE_ENV") === "production" && photoKeys.some((value) => /^(file|content|ph):/i.test(value))) throw new ConflictException("Proof media storage provider is not configured.");
    const capturedAt = new Date(input.capturedAt);
    if (Number.isNaN(capturedAt.getTime())) throw new BadRequestException("A valid capture timestamp is required.");
    return this.prisma.$transaction(async (tx) => {
      const proof = await tx.proofOfHandover.create({ data: { capturedAt, confirmedByUserId: user.id, idempotencyKey: key, kind: HandoverKind.PICKUP, lat: input.location?.latitude, lng: input.location?.longitude, photoKeys, signatureKey: input.signature, tripId, weighedMon: input.weightMon } });
      await tx.trip.update({ where: { id: tripId }, data: { state: TripState.PICKED_UP } });
      return proof;
    });
  }

  async jobs(user: PlatformAuthenticatedUser, query: { district?: string; minMon?: string; sort?: string }) {
    const carrier = await this.carrier(user.id);
    const districtIds = carrier.districts.map((district) => district.id);
    return this.prisma.trip.findMany({ where: { state: TripState.OFFERED, order: { quantity: query.minMon ? { gte: Number(query.minMon) } : undefined }, stops: { some: { districtId: query.district ?? { in: districtIds } } } }, select: { bids: { select: { amount: true, createdAt: true }, orderBy: { amount: "asc" } }, deliverAt: true, distanceKm: true, fee: true, id: true, order: { select: { quantity: true, listing: { select: { crop: { select: { nameBn: true } } } } } }, pickupAt: true, stops: { select: { address: true, district: { select: { nameBn: true } }, kind: true } } }, orderBy: query.sort === "fee_desc" ? { fee: "desc" } : { pickupAt: "asc" } });
  }

  async bid(user: PlatformAuthenticatedUser, tripId: string, amountPoisha: number) {
    const carrier = await this.carrier(user.id);
    if (!Number.isSafeInteger(amountPoisha) || amountPoisha <= 0) throw new BadRequestException("Bid amount must be positive integer poisha.");
    const trip = await this.prisma.trip.findUnique({ where: { id: tripId } });
    if (!trip || trip.state !== TripState.OFFERED) throw new ConflictException("Trip is not open for bids.");
    return this.prisma.tripBid.upsert({ where: { tripId_carrierId: { carrierId: carrier.id, tripId } }, update: { amount: amountPoisha, createdAt: new Date(), state: TripBidState.OPEN }, create: { amount: amountPoisha, carrierId: carrier.id, tripId } });
  }

  async earnings(user: PlatformAuthenticatedUser) {
    const carrier = await this.carrier(user.id);
    const payouts = await this.prisma.carrierPayout.findMany({ where: { carrierId: carrier.id }, select: { amount: true, createdAt: true, id: true, state: true, trip: { select: { id: true } } }, orderBy: { createdAt: "desc" } });
    return { ledger: payouts, pendingPoisha: payouts.filter((item) => item.state === CarrierPayoutState.PENDING).reduce((sum, item) => sum + item.amount, 0), weekPoisha: payouts.reduce((sum, item) => sum + item.amount, 0), withdrawablePoisha: payouts.filter((item) => item.state === CarrierPayoutState.AVAILABLE).reduce((sum, item) => sum + item.amount, 0) };
  }

  async withdraw(user: PlatformAuthenticatedUser, key: string, amountPoisha: number) {
    if (!key) throw new BadRequestException("Idempotency-Key is required.");
    const carrier = await this.carrier(user.id);
    const scope = "carrier-withdraw";
    const existing = await this.prisma.idempotencyRecord.findUnique({ where: { userId_scope_key: { key, scope, userId: user.id } } });
    if (existing) return existing.response;
    const available = await this.prisma.carrierPayout.aggregate({ _sum: { amount: true }, where: { carrierId: carrier.id, state: CarrierPayoutState.AVAILABLE } });
    if (!Number.isSafeInteger(amountPoisha) || amountPoisha <= 0 || amountPoisha > (available._sum.amount ?? 0)) throw new BadRequestException("Withdrawal exceeds available earnings.");
    const response = { amountPoisha, requested: true };
    await this.prisma.idempotencyRecord.create({ data: { key, response, scope, userId: user.id } });
    return response;
  }

  async online(user: PlatformAuthenticatedUser, online: boolean) { const carrier = await this.carrier(user.id); return this.prisma.carrier.update({ where: { id: carrier.id }, data: { online } }); }

  async location(user: PlatformAuthenticatedUser, tripId: string, input: { at: string; lat: number; lng: number }) {
    const carrier = await this.carrier(user.id);
    const trip = await this.prisma.trip.findFirst({ where: { id: tripId, carrierId: carrier.id } });
    if (!trip) throw new NotFoundException("Trip not found.");
    if (trip.state !== TripState.EN_ROUTE_PICKUP && trip.state !== TripState.EN_ROUTE_DELIVERY) throw new ForbiddenException("Location is accepted only while the trip is en route.");
    const at = new Date(input.at);
    if (!Number.isFinite(input.lat) || !Number.isFinite(input.lng) || Number.isNaN(at.getTime())) throw new BadRequestException("Valid location and timestamp are required.");
    return this.prisma.trip.update({ where: { id: tripId }, data: { currentLat: input.lat, currentLng: input.lng, locationAt: at } });
  }

  private async carrier(userId: string) {
    const carrier = await this.prisma.carrier.findUnique({ where: { userId }, include: { districts: true } });
    if (!carrier || carrier.status !== CarrierStatus.ACTIVE) throw new ForbiddenException("Carrier account is unavailable.");
    return carrier;
  }

  private safeTripSelect() {
    return { acceptedAt: true, deliverAt: true, distanceKm: true, fee: true, id: true, locationAt: true, currentLat: true, currentLng: true, order: { select: { code: true, quantity: true, listing: { select: { crop: { select: { nameBn: true } }, grade: true } } } }, pickupAt: true, state: true, stops: { select: { address: true, arrivedAt: true, completedAt: true, district: { select: { nameBn: true } }, kind: true, lat: true, lng: true } } } satisfies Prisma.TripSelect;
  }
}
