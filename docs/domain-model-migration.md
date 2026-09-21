# Domain Model Migration: Findings and Plan

Date: 2026-09-21
Author: Jasim Uddin
Basis: `origin/main` at `2eeb8fb`.

## TL;DR

I did not execute this migration, and I am recommending it is not attempted as one change. The two model sets are not two spellings of the same domain: they disagree on **how many farmers an order can have**, on **what units quantity and money are in**, and on **which fields exist at all**. Neither is a superset of the other, so any backfill either loses data or needs the target schema extended first.

The website's live data (users, lots, orders, escrow rows, payouts) is on the legacy side, so a wrong backfill is not recoverable by a revert.

What I did do:

- Mapped the two sets field by field, which is the prerequisite for any backfill and is written up below.
- Found and fixed a live defect the mapping turned up: the platform `createOrder` had the same overselling bug the website had before #13, in a worse form. That fix is direction-independent and is on `fix/listing-reservation`.
- Produced a phased plan where each phase is separately shippable and reversible.

The one decision I cannot make: **which model wins.** My recommendation is the platform model, with the legacy web app migrated onto it, but the reasoning and the cost are below and the call is yours. Phase 0 is safe to start under either answer.

---

## 1. The four hard problems

### 1.1 Order cardinality differs (the expensive one)

| | Legacy | Platform |
|---|---|---|
| Order to farmer | many, via `OrderItem` to `CropLot.farmerId` | exactly one, `Order.farmerId` |
| Order to lot | many `OrderItem` rows | exactly one `Order.listingId` |

A legacy order is a basket that can draw on several farmers' lots. `orders.service.ts` splits money per farmer (`farmerIds`, `perFarmer`), and #15's `Review` is keyed `(orderId, revieweeId)` precisely because one order can involve several farmers.

A platform order is one listing, one farmer, one quantity.

So migrating legacy to platform means **splitting** every multi-item legacy order into several platform orders. That changes order identity: one reference becomes many, the buyer's history changes shape, escrow held once must be split across new rows, and any `Review` keyed on the old order id has to be re-pointed. Splitting money that was already released is the part that worries me most, because the split has to reproduce exactly what was paid, not recompute it.

Going the other way is easy: each platform order wraps in a single-item legacy order.

### 1.2 Units differ, and the platform side is narrower

Verified in `mobile-v1.service.ts` (`pricePoisha`, `quantityMon`):

| Concept | Legacy | Platform |
|---|---|---|
| Quantity | `quantityKg Decimal(12,2)` | `quantity Int`, whole **mon** |
| Price | `pricePerKg Decimal(12,2)` taka | `price Int`, **poisha per mon** |
| Order money | `cropTotal`, `transportAmount`, `feeAmount`, `totalValue`, all `Decimal(12,2)` | `unitPrice`, `total`, `feeAmount`, all `Int` |

Legacy to platform is lossy in both dimensions: decimal kilograms round to whole mon (1 mon is about 37.324 kg, so a 120.5 kg lot cannot be expressed), and a per-kg taka price converts to poisha-per-mon with rounding. Platform to legacy is not lossy, since `Int` widens into `Decimal`.

Legacy also carries a **three-way money split** (crop, transport, platform fee) that the dashboards read from stored columns rather than recomputing. Platform `Order` has no `transportAmount`, so transport money has nowhere to go without a schema change.

### 1.3 Fields that exist on only one side

Dropped if legacy migrates to platform as it stands:

- `CropLot.upazilla`, with no equivalent on `Listing`. Location granularity below district disappears, and the marketplace displays it.
- `CropLot.harvestDate`, with no equivalent.
- `CropLot.transportIncluded` and `pickupWithin24h`: `Listing` has a free-text `pickupWindow` instead, so two booleans the marketplace filters on become a string.
- `LotOffer.note` and `respondedAt`, neither of which `Offer` has.
- `LegacyOrder.deliveryAddress`, `targetDate`, `notes`, `upazilla`, `disputeOpenedAt`.
- `LotStatus.RESERVED`, for which `ListingStatus` has no equivalent.

Dropped in the other direction: `Listing.suspendedById` / `suspendReason`, and the whole carrier, trip, KYC, device and notification-preference graph, which has no legacy counterpart at all.

That last point matters: the carrier platform is the most mature subsystem in the repo and it only exists on the platform side. Migrating everything to legacy would mean abandoning or rebuilding it.

### 1.4 Enums do not line up

| Legacy | Platform | Note |
|---|---|---|
| `Role`: ADMIN, BUYER, FARMER, GUEST | `PlatformRole`: FARMER, BUYER, CARRIER, STAFF | ADMIN/STAFF rename; GUEST has no target; CARRIER has no source |
| `AccountStatus`: PENDING, ACTIVE, REJECTED | `PlatformUserStatus`: ACTIVE, PENDING, RESTRICTED | REJECTED to RESTRICTED changes meaning |
| `LotStatus`: DRAFT, ACTIVE, RESERVED, SOLD, CANCELLED | `ListingStatus`: DRAFT, LIVE, PAUSED, SUSPENDED, SOLD | no RESERVED; CANCELLED to PAUSED or SUSPENDED is a judgement |
| `OrderStatus`: 7 states | `OrderStage`: 6 states | not a relabelling: QUALITY_CHECK and MATCHING have no target, REFUNDED is a stage on one side and a payment state on the other |
| `PaymentStatus` | `EscrowState` + `PayoutState` | one enum becomes two |

`OrderStatus` to `OrderStage` is the one to be careful with, because the website's buyer-facing five-stage timeline (`orderStages.ts`) is derived from `OrderStatus` and would need remapping.

---

## 2. What is already bridged, and what is not

Identity **is** bridged, deliberately and carefully. `mobile-auth.service.ts` writes both a `LegacyUser` and a `User` inside one transaction on mobile registration, and mobile login authenticates against the legacy row. The join key is the phone number.

Nothing else is bridged. Verified by which models each module touches:

| Concern | Website | Mobile API |
|---|---|---|
| Identity | `LegacyUser` | `User` (table `PlatformUser`) |
| Inventory | `CropLot`, `CropLotPhoto` | `Listing`, `ListingPhoto` |
| Offers | `LotOffer` | `Offer` |
| Orders | `LegacyOrder`, `OrderItem` | `Order` |
| Money | `Payment`, `LegacyPayout` | `Escrow`, `Payout` |
| Messaging | `ChatThread`, `ChatMessage` | `Thread`, `ThreadMember`, `Message` |
| Notifications | `LegacyNotification` | `Notification`, `NotificationPref` |
| Audit | `LegacyAuditLog` | `AuditLog` |
| Reviews | `Review` (added in #15) | none |
| Logistics, KYC | none | `Carrier`, `Trip`, `TripBid`, `ProofOfHandover`, `KycProfile`, `PayoutAccount` |

`mobile-v1` never reads `cropLot`. The website's `lots` and `orders` services never read `prisma.listing` or the platform `prisma.order`.

---

## 3. Recommendation: platform wins, website migrates onto it

Reasons, in order of weight:

1. **The carrier platform only exists there**, along with KYC, payout accounts, device management with token revocation, and idempotency records. That is the most mature code in the repo and the biggest unrealised business asset. Migrating to legacy would mean rebuilding it.
2. **The platform schema is better shaped**: escrow and payout as separate state machines, notification preferences, threads with members, an audit log that is actually written.
3. Its identity model already anticipates the merge, and the bridge writes both rows today.

The cost is real and should be stated plainly:

- The order split in 1.1, including for orders whose money has already moved.
- Extending `Listing` and `Order` to hold what legacy carries (upazilla, harvest date, transport flags, delivery address, target date, transport amount) before any backfill, or accepting the loss.
- Rewriting six website backend modules and the web frontend's data mapping.
- Deciding whether to widen quantity and price to decimals, or to accept whole mon and poisha as the platform's units and round the existing rows once, irreversibly.

My view on that last one: widen the platform columns to `Decimal` before backfilling. Rounding live inventory and prices to save a schema change is the sort of decision that looks cheap now and is unpickable later.

---

## 4. Phased plan

Each phase ships on its own and is reversible. No phase after 0 should start before the one before it is deployed and quiet.

**Phase 0: stop the divergence (safe, direction-independent, start now)**

1. Fix the platform overselling defect. Done, on `fix/listing-reservation`.
2. Freeze new schema surface on the legacy side. New work targets platform models or is written to port.
3. Add a reconciliation report: a read-only job that counts rows on both sides and lists phone numbers that exist as `LegacyUser` with no `User` or the reverse. Nobody currently knows the size of the divergence, and no backfill should be designed without that number.

**Phase 1: make platform a superset (schema only, no data moves)**

4. Widen `Listing.quantity` and `Listing.price`, and `Order.unitPrice`/`total`/`feeAmount`, to `Decimal(12,2)`.
5. Add the missing columns: `Listing.upazila`, `Listing.harvestDate`, `Listing.transportIncluded`, `Listing.pickupWithin24h`; `Order.deliveryAddress`, `Order.targetDate`, `Order.notes`, `Order.transportAmount`, `Order.upazila`.
6. Add `ListingStatus.RESERVED`, and map `OrderStatus` onto `OrderStage` in one documented module with a test per state, including the states that have no natural target.

All additive. Nothing reads the new columns yet.

**Phase 2: dual write (reversible, the real test)**

7. Website writes go to both models, platform write second and non-fatal at first so a bug cannot take the site down.
8. Backfill historical rows in dependency order: users, districts, crops, lots, offers, orders (with the split), escrow, payouts, reviews.
9. The reconciliation report from Phase 0 becomes the gate: it must reach zero discrepancies and hold there before Phase 3.

**Phase 3: flip reads (one module at a time)**

10. Move website reads to platform models per module, marketplace first (lowest risk, no money), orders and escrow last.
11. Each module's flip is its own deploy, with the reconciliation report watched across it.

**Phase 4: remove legacy**

12. Stop legacy writes, wait out a retention window, then drop the legacy tables in one migration.
13. Delete the identity bridge in `mobile-auth.service.ts`.

---

## 5. What has to be true before Phase 1

- A staging database restored from a production snapshot. The backfill cannot be designed, let alone trusted, against seed data. This is the blocker.
- The row counts and divergence numbers from the Phase 0 reconciliation report.
- A decision on the units question in section 3.
- A decision on how order splitting handles orders whose escrow is already released.

---

## 6. Limitations of this document

- I have no access to the production database. Every statement here is from the schema and the code; none of it is informed by actual row counts, and the divergence between the two identity tables could be anywhere from nothing to substantial.
- I have not written or tested any backfill. The dependency order in Phase 2 is derived from foreign keys, not from a rehearsal.
- The order-splitting problem in 1.1 is described, not solved. It needs a rehearsal against a production snapshot before anyone commits to an approach.
- I did not audit the mobile app's own expectations of the platform API, so Phase 1's column widening may have client-side consequences I have not checked.
