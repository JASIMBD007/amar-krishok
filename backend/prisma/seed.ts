import {
  CarrierPayoutState,
  DisputeState,
  EscrowState,
  KycStatus,
  ListingGrade,
  ListingStatus,
  NotificationCategory,
  NotificationChannel,
  PayoutMethod,
  PlatformRole,
  PlatformUserStatus,
  PrismaClient,
  ThreadKind,
  TripState,
  TripStopKind,
} from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();
const seedNow = new Date("2026-08-06T08:00:00.000Z");

function poisha(taka: number) {
  const value = taka * 100;
  if (!Number.isSafeInteger(value)) {
    throw new Error(`Seed money must be integer poisha: ${taka}`);
  }
  return value;
}

const crops = [
  { id: "crop-potato", key: "potato", name: "Potato", nameBn: "আলু" },
  { id: "crop-boro-rice", key: "boro-rice", name: "Boro rice", nameBn: "বোরো ধান" },
  { id: "crop-onion", key: "onion", name: "Onion", nameBn: "পেঁয়াজ" },
  { id: "crop-tomato", key: "tomato", name: "Tomato", nameBn: "টমেটো" },
  { id: "crop-jute", key: "jute", name: "Jute", nameBn: "পাট" },
] as const;

const districts = [
  { id: "district-bogura", name: "Bogura", nameBn: "বগুড়া" },
  { id: "district-faridpur", name: "Faridpur", nameBn: "ফরিদপুর" },
  { id: "district-naogaon", name: "Naogaon", nameBn: "নওগাঁ" },
  { id: "district-rangpur", name: "Rangpur", nameBn: "রংপুর" },
  { id: "district-dhaka", name: "Dhaka", nameBn: "ঢাকা" },
  { id: "district-chattogram", name: "Chattogram", nameBn: "চট্টগ্রাম" },
] as const;

const users = [
  { id: "U1", name: "Sultana Begum", phone: "+8801711004442", role: PlatformRole.FARMER, district: "Bogura", status: PlatformUserStatus.ACTIVE, joined: 2011 },
  { id: "U2", name: "Rafiq Traders", phone: "+8801712004556", role: PlatformRole.BUYER, district: "Dhaka", status: PlatformUserStatus.ACTIVE, joined: 2019 },
  { id: "U3", name: "Md. Anwar Hossain", phone: "+8801733991087", role: PlatformRole.FARMER, district: "Bogura", status: PlatformUserStatus.PENDING, joined: 2024 },
  { id: "U4", name: "Chattogram Wholesale", phone: "+8801818220190", role: PlatformRole.BUYER, district: "Chattogram", status: PlatformUserStatus.ACTIVE, joined: 2016 },
  { id: "U5", name: "Jahanara Khatun", phone: "+8801755610233", role: PlatformRole.FARMER, district: "Faridpur", status: PlatformUserStatus.RESTRICTED, joined: 2022 },
  { id: "U6", name: "Nurul Islam", phone: "+8801799145802", role: PlatformRole.FARMER, district: "Naogaon", status: PlatformUserStatus.ACTIVE, joined: 2007 },
  // The prototype's listing and dispute fixtures name these farmers even though its directory array omits them.
  { id: "U7", name: "Rahim Uddin", phone: "+8801700000007", role: PlatformRole.FARMER, district: "Bogura", status: PlatformUserStatus.ACTIVE, joined: 2009 },
  { id: "U8", name: "Abdul Karim", phone: "+8801700000008", role: PlatformRole.FARMER, district: "Rangpur", status: PlatformUserStatus.ACTIVE, joined: 2015 },
  { id: "U9", name: "Kamal Transport", phone: "+8801711828290", role: PlatformRole.CARRIER, district: "Dhaka", status: PlatformUserStatus.ACTIVE, joined: 2018 },
] as const;

const listings = [
  { id: "L1", crop: "Potato", district: "Bogura", farmer: "Sultana Begum", grade: ListingGrade.A, quantity: 200, priceTaka: 1188, pickupWindow: "Transport included" },
  { id: "L2", crop: "Potato", district: "Bogura", farmer: "Rahim Uddin", grade: ListingGrade.A, quantity: 120, priceTaka: 1290, pickupWindow: "Within 24 h" },
  { id: "L3", crop: "Potato", district: "Bogura", farmer: "Md. Anwar Hossain", grade: ListingGrade.B, quantity: 90, priceTaka: 1140, pickupWindow: "Within 24 h" },
  { id: "L4", crop: "Onion", district: "Faridpur", farmer: "Sultana Begum", grade: ListingGrade.A, quantity: 80, priceTaka: 2140, pickupWindow: "Transport included" },
  { id: "L5", crop: "Boro rice", district: "Naogaon", farmer: "Nurul Islam", grade: ListingGrade.A, quantity: 240, priceTaka: 1310, pickupWindow: "Transport included" },
  { id: "L6", crop: "Tomato", district: "Bogura", farmer: "Rahim Uddin", grade: ListingGrade.B, quantity: 40, priceTaka: 940, pickupWindow: "Within 24 h" },
  { id: "L7", crop: "Jute", district: "Rangpur", farmer: "Abdul Karim", grade: ListingGrade.A, quantity: 150, priceTaka: 3040, pickupWindow: "Transport included" },
  { id: "L8", crop: "Onion", district: "Faridpur", farmer: "Jahanara Khatun", grade: ListingGrade.B, quantity: 60, priceTaka: 2320, pickupWindow: "Within 24 h", status: ListingStatus.SUSPENDED, suspendReason: "Image mismatch" },
] as const;

const notifications = [
  { id: "N1", category: NotificationCategory.ORDER, icon: "truck", tone: "blue", title: "AK-4821 picked up", body: "Sultana Begum handed 120 mon Potato Grade A to the transporter. Delivery expected tomorrow 14:00.", entityRef: "order:AK-4821", sentAt: "2026-08-06T07:48:00.000Z", unread: true },
  { id: "N2", category: NotificationCategory.ORDER, icon: "handshake", tone: "green", title: "Offer accepted", body: "Chattogram Wholesale accepted ৳ 940 / mon for Tomato Grade B · 40 mon.", entityRef: "listing:L6", sentAt: "2026-08-06T07:00:00.000Z", unread: true },
  { id: "N3", category: NotificationCategory.ORDER, icon: "package-check", tone: "green", title: "AK-4818 delivered", body: "Buyer confirmed delivery. Escrow released automatically.", entityRef: "order:AK-4818", sentAt: "2026-08-05T08:00:00.000Z", unread: false },
  { id: "N4", category: NotificationCategory.PAYOUT, icon: "banknote", tone: "green", title: "৳ 148.500 paid out", body: "Sent to bKash 01711 ••• 442. Reference PB-99231.", entityRef: "payout:PB-99231", sentAt: "2026-08-06T05:00:00.000Z", unread: true },
  { id: "N5", category: NotificationCategory.PAYOUT, icon: "shield-check", tone: "blue", title: "Escrow held for AK-4821", body: "৳ 142.560 is locked until delivery is confirmed.", entityRef: "order:AK-4821", sentAt: "2026-08-05T08:00:00.000Z", unread: false },
  { id: "N6", category: NotificationCategory.RATE, icon: "trending-up", tone: "green", title: "Onion up 4,8 % in Faridpur", body: "Today ৳ 2.250 / mon. Your open lot is priced ৳ 110 below the district rate.", entityRef: "rate:onion:faridpur", sentAt: "2026-08-06T02:00:00.000Z", unread: true },
  { id: "N7", category: NotificationCategory.RATE, icon: "trending-down", tone: "red", title: "Potato down 1,4 % in Bogura", body: "Today ৳ 1.250 / mon. Two of your lots sit above the fair range.", entityRef: "rate:potato:bogura", sentAt: "2026-08-06T02:00:00.000Z", unread: false },
  { id: "N8", category: NotificationCategory.SYSTEM, icon: "badge-check", tone: "green", title: "Verification approved", body: "Your NID and land record were checked by staff. The verified badge is live.", entityRef: "user:U2", sentAt: "2026-08-04T08:00:00.000Z", unread: false },
  { id: "N9", category: NotificationCategory.SYSTEM, icon: "smartphone", tone: "grey", title: "New device signed in", body: "Android · Dhaka. If this was not you, change your PIN.", entityRef: "device:android-dhaka", sentAt: "2026-08-02T08:00:00.000Z", unread: false },
] as const;

async function clearPlatformSeed() {
  await prisma.$transaction([
    prisma.auditLog.deleteMany(),
    prisma.platformMedia.deleteMany(),
    prisma.idempotencyRecord.deleteMany(),
    prisma.notification.deleteMany(),
    prisma.notificationPref.deleteMany(),
    prisma.message.deleteMany(),
    prisma.threadMember.deleteMany(),
    prisma.thread.deleteMany(),
    prisma.dispute.deleteMany(),
    prisma.proofOfHandover.deleteMany(),
    prisma.carrierPayout.deleteMany(),
    prisma.tripBid.deleteMany(),
    prisma.tripStop.deleteMany(),
    prisma.trip.deleteMany(),
    prisma.escrow.deleteMany(),
    prisma.order.deleteMany(),
    prisma.offer.deleteMany(),
    prisma.listingPhoto.deleteMany(),
    prisma.listing.deleteMany(),
    prisma.payout.deleteMany(),
    prisma.marketRate.deleteMany(),
    prisma.rateFeed.deleteMany(),
    prisma.kycDocument.deleteMany(),
    prisma.kycProfile.deleteMany(),
    prisma.payoutAccount.deleteMany(),
    prisma.device.deleteMany(),
    prisma.staffRole.deleteMany(),
    prisma.carrier.deleteMany(),
    prisma.user.deleteMany(),
  ]);
}

async function main() {
  await clearPlatformSeed();

  for (const district of districts) {
    await prisma.district.upsert({
      create: { ...district, nameEn: district.name },
      update: { active: true, nameBn: district.nameBn, nameEn: district.name },
      where: { name: district.name },
    });
  }

  for (const crop of crops) {
    await prisma.crop.upsert({
      create: { ...crop, nameEn: crop.name, unit: "mon" },
      update: { active: true, key: crop.key, nameBn: crop.nameBn, nameEn: crop.name, unit: "mon" },
      where: { name: crop.name },
    });
  }

  const districtByName = new Map((await prisma.district.findMany({ where: { name: { in: districts.map((item) => item.name) } } })).map((district) => [district.name, district]));
  const cropByName = new Map((await prisma.crop.findMany({ where: { name: { in: crops.map((item) => item.name) } } })).map((crop) => [crop.name, crop]));
  const pinHash = await hash("1234", 10);

  for (const user of users) {
    const district = districtByName.get(user.district);
    if (!district) throw new Error(`Missing seed district: ${user.district}`);
    await prisma.user.create({
      data: {
        createdAt: new Date(`${user.joined}-01-01T00:00:00.000Z`),
        districtId: district.id,
        email: user.id === "U2" ? "rafiq@traders.bd" : undefined,
        bio: user.id === "U2" ? "Wholesale buyer for 6 retail outlets in Dhaka. Buys potato, onion and rice weekly." : undefined,
        id: user.id,
        locale: "bn-BD",
        name: user.name,
        passwordHash: pinHash,
        phone: user.phone,
        pinHash,
        role: user.role,
        status: user.status,
        twoFactorEnabled: user.id === "U2",
        upazila: user.id === "U2" ? "Savar" : "",
      },
    });
  }

  const platformUsers = await prisma.user.findMany();
  const userByName = new Map(platformUsers.map((user) => [user.name, user]));

  await prisma.kycProfile.create({
    data: { khatian: "Khatian 1142 · Shibganj", nid: "1994 7712 004 556", status: KycStatus.VERIFIED, userId: "U2" },
  });
  await prisma.payoutAccount.create({
    data: { accountNo: "+8801712004556", method: PayoutMethod.BKASH, userId: "U2", verifiedAt: seedNow },
  });
  await prisma.notificationPref.create({ data: { appAll: true, smsOrders: true, smsRates: true, userId: "U2", weeklyDigest: false } });

  for (const listing of listings) {
    const crop = cropByName.get(listing.crop);
    const district = districtByName.get(listing.district);
    const farmer = userByName.get(listing.farmer);
    if (!crop || !district || !farmer) throw new Error(`Broken listing fixture: ${listing.id}`);
    await prisma.listing.create({
      data: {
        createdAt: new Date("2026-08-01T02:00:00.000Z"),
        cropId: crop.id,
        districtId: district.id,
        farmerId: farmer.id,
        grade: listing.grade,
        id: listing.id,
        pickupWindow: listing.pickupWindow,
        price: poisha(listing.priceTaka),
        quantity: listing.quantity,
        status: "status" in listing ? listing.status : ListingStatus.LIVE,
        suspendReason: "suspendReason" in listing ? listing.suspendReason : undefined,
      },
    });
    await prisma.listingPhoto.create({
      data: { caption: `${listing.crop} · Grade ${listing.grade}`, id: `${listing.id}-photo-1`, listingId: listing.id, objectKey: `seed/listings/${listing.id}/cover.webp`, position: 0 },
    });
  }

  await prisma.listingPhoto.createMany({
    data: [
      { caption: "Close-up of tubers", id: "L2-photo-2", listingId: "L2", objectKey: "seed/listings/L2/detail.webp", position: 1 },
      { caption: "Weighbridge slip", id: "L2-photo-3", listingId: "L2", objectKey: "seed/listings/L2/weighbridge.webp", position: 2 },
    ],
  });

  const orderFixtures = [
    { id: "order-ak-4818", code: "AK-4818", listingId: "L1", buyerId: "U2", farmerId: "U1", quantity: 70, unitPriceTaka: 1200, totalTaka: 84000 },
    { id: "order-ak-4802", code: "AK-4802", listingId: "L7", buyerId: "U4", farmerId: "U8", quantity: 15, unitPriceTaka: 3040, totalTaka: 45600 },
    { id: "order-ak-4790", code: "AK-4790", listingId: "L8", buyerId: "U2", farmerId: "U5", quantity: 60, unitPriceTaka: 2320, totalTaka: 139200 },
  ] as const;

  for (const order of orderFixtures) {
    await prisma.order.create({
      data: {
        buyerId: order.buyerId,
        code: order.code,
        createdAt: new Date("2026-08-03T08:00:00.000Z"),
        farmerId: order.farmerId,
        feeAmount: 0,
        id: order.id,
        listingId: order.listingId,
        paymentMethod: "bKash",
        quantity: order.quantity,
        stage: "DELIVERED",
        total: poisha(order.totalTaka),
        unitPrice: poisha(order.unitPriceTaka),
      },
    });
    await prisma.escrow.create({
      data: { amount: poisha(order.totalTaka), heldAt: new Date("2026-08-03T08:05:00.000Z"), orderId: order.id, state: EscrowState.FROZEN },
    });
  }

  const carrier = await prisma.carrier.create({
    data: {
      capacityMon: 240,
      companyName: "Kamal Transport",
      districts: { connect: [{ id: "district-bogura" }, { id: "district-dhaka" }, { id: "district-faridpur" }, { id: "district-chattogram" }] },
      id: "carrier-kamal",
      online: true,
      ratingAvg: 4.8,
      userId: "U9",
      vehicleReg: "DHAKA-METRO-TA-11-8289",
    },
  });
  const trip = await prisma.trip.create({
    data: {
      acceptedAt: new Date("2026-08-06T01:00:00.000Z"),
      carrierId: carrier.id,
      deliverAt: new Date("2026-08-07T08:00:00.000Z"),
      distanceKm: 144,
      fee: poisha(4200),
      id: "trip-ak-4818",
      orderId: "order-ak-4818",
      pickupAt: new Date("2026-08-06T03:30:00.000Z"),
      state: TripState.EN_ROUTE_DELIVERY,
    },
  });
  await prisma.tripStop.createMany({ data: [
    { address: "Shibganj depot", districtId: "district-bogura", id: "stop-ak-4818-pickup", kind: TripStopKind.PICKUP, lat: 24.8500, lng: 89.3700, tripId: trip.id },
    { address: "Karwan Bazar", districtId: "district-dhaka", id: "stop-ak-4818-delivery", kind: TripStopKind.DELIVERY, lat: 23.7515, lng: 90.3932, tripId: trip.id },
  ] });
  await prisma.carrierPayout.create({ data: { amount: poisha(4200), carrierId: carrier.id, id: "carrier-payout-ak-4818", state: CarrierPayoutState.PENDING, tripId: trip.id } });

  await prisma.dispute.createMany({
    data: [
      { code: "D-118", id: "dispute-d-118", openedById: "U2", orderId: "order-ak-4818", slaDueAt: new Date("2026-08-06T13:00:00.000Z"), state: DisputeState.OPEN, subject: "Quality below Grade A" },
      { code: "D-117", id: "dispute-d-117", openedById: "U4", orderId: "order-ak-4802", slaDueAt: new Date("2026-08-07T06:00:00.000Z"), state: DisputeState.AWAITING_INFO, subject: "Short weight — 3,2 mon missing" },
      { code: "D-115", id: "dispute-d-115", openedById: "U2", orderId: "order-ak-4790", slaDueAt: new Date("2026-08-06T04:00:00.000Z"), state: DisputeState.OPEN, subject: "Late delivery, buyer wants refund" },
    ],
  });

  await prisma.thread.createMany({
    data: [
      { id: "T1", kind: ThreadKind.DIRECT, orderId: "order-ak-4818", subject: "AK-4821 · Potato Grade A · 120 mon" },
      { escalatedAt: new Date("2026-08-05T08:00:00.000Z"), id: "T2", kind: ThreadKind.SUPPORT, orderId: "order-ak-4818", subject: "Dispute D-118 · quality claim" },
      { id: "T3", kind: ThreadKind.DIRECT, subject: "Tomato Grade B · 40 mon" },
    ],
  });
  await prisma.threadMember.createMany({
    data: [
      { lastReadAt: seedNow, threadId: "T1", userId: "U1" },
      { lastReadAt: new Date("2026-08-06T02:19:00.000Z"), threadId: "T1", userId: "U2" },
      { lastReadAt: new Date("2026-08-05T08:00:00.000Z"), threadId: "T2", userId: "U2" },
      { lastReadAt: seedNow, threadId: "T3", userId: "U2" }, { lastReadAt: seedNow, threadId: "T3", userId: "U4" },
    ],
  });
  await prisma.message.createMany({
    data: [
      { authorId: "U1", body: "The lot is loaded. Transporter leaves Bogura at 09:30.", createdAt: new Date("2026-08-06T02:12:00.000Z"), id: "T1-M1", threadId: "T1" },
      { authorId: "U2", body: "Good. Please send the weighbridge slip when you have it.", createdAt: new Date("2026-08-06T02:20:00.000Z"), id: "T1-M2", threadId: "T1" },
      { authorId: "U1", body: "Weighbridge shows 120,4 mon. Slip attached at the depot office.", createdAt: new Date("2026-08-06T02:41:00.000Z"), id: "T1-M3", threadId: "T1" },
      { authorId: "U2", body: "Two sacks in AK-4818 were below Grade A. Can we hold part of the escrow?", createdAt: new Date("2026-08-05T08:00:00.000Z"), id: "T2-M1", threadId: "T2" },
      { body: "We have paused the release and asked the farmer for photos. Decision within 24 h.", createdAt: new Date("2026-08-05T08:10:00.000Z"), id: "T2-M2", threadId: "T2" },
      { body: "Photos received. We propose a ৳ 4.200 partial refund — accept?", createdAt: new Date("2026-08-06T01:55:00.000Z"), id: "T2-M3", threadId: "T2" },
      { authorId: "U4", body: "Can you hold the lot until Thursday?", createdAt: new Date("2026-08-03T08:00:00.000Z"), id: "T3-M1", threadId: "T3" },
      { authorId: "U2", body: "Yes, until Thursday 18:00. After that it goes back on the market.", createdAt: new Date("2026-08-03T08:10:00.000Z"), id: "T3-M2", threadId: "T3" },
    ],
  });

  await prisma.notification.createMany({
    data: notifications.map((notification) => ({
      body: notification.body,
      category: notification.category,
      channel: NotificationChannel.APP,
      createdAt: new Date(notification.sentAt),
      entityRef: notification.entityRef,
      icon: notification.icon,
      id: notification.id,
      readAt: notification.unread ? null : new Date(notification.sentAt),
      sentAt: new Date(notification.sentAt),
      title: notification.title,
      tone: notification.tone,
      userId: "U2",
    })),
  });

  const counts = {
    crops: await prisma.crop.count({ where: { name: { in: crops.map((crop) => crop.name) } } }),
    directoryUsers: await prisma.user.count({ where: { id: { in: ["U1", "U2", "U3", "U4", "U5", "U6"] } } }),
    disputes: await prisma.dispute.count(),
    districts: await prisma.district.count({ where: { name: { in: districts.map((district) => district.name) } } }),
    listings: await prisma.listing.count(),
    notifications: await prisma.notification.count(),
    supportingUsers: await prisma.user.count({ where: { id: { in: ["U7", "U8"] } } }),
    threads: await prisma.thread.count(),
  };
  console.info("P0 seed complete", counts);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
