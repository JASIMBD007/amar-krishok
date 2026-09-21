# AmarKrishok: Multi-Role Analysis (against `main`)

Date: 2026-09-21
Author: Jasim Uddin
Scope: buyer, farmer, and admin usability; business opportunities; technical risk.
Basis: `origin/main` at `7338aef`, which is what www.amarkrishok.com deploys, plus live probing of production.

## TL;DR

This supersedes an earlier draft that analyzed a branch 156 commits behind `main`. That draft's central claim, that the three roles share no transaction object, **was wrong for the shipped product.** Farmers can see and act on orders, offers and counter-offers exist, escrow and disputes exist, per-role dashboards exist, and a complete carrier logistics API with trip bidding and proof of handover is already built.

The real problems are different and, in one case, worse.

The most serious finding: **every seller star rating and completed-order count on the live marketplace is fabricated in the browser from a checksum of the lot's database id.** There is no review model and the backend never sends these fields. Production right now shows the same farmer with five different star ratings across five lots. Buyers prepay strangers on the strength of that number.

Second: the codebase runs **two parallel domain models that never meet.** The website's buyers, farmers, lots, orders, and money live in `CropLot` / `LegacyOrder` / `Payment`. The mobile API's live in `Listing` / `Order` / `Escrow`. Identity is bridged by phone number; business data is not bridged at all.

Third: **ordering never reserves inventory.** `LotStatus.RESERVED` and `SOLD` exist only as display labels and are never assigned, and the order service makes no write to `CropLot`. The same lot can be sold repeatedly, and now escrow money is attached to those sales.

Biggest unrealized asset: the carrier platform is built and, as far as the web product shows, unused.

---

## 1. Correction to the earlier draft

Stated plainly, because the earlier document is committed and could mislead.

| Earlier claim | Actual state on `main` |
|---|---|
| Farmers cannot see orders | `GET /orders` is `@Auth(ADMIN, BUYER, FARMER)` |
| No order state machine | `PATCH /orders/:id/advance` plus an `OrderStage` enum |
| No escrow | `PATCH /orders/:id/escrow`, `GET /orders/farmer-escrow`, `Escrow` model |
| No disputes | `PATCH /orders/:id/dispute`, `GET /orders/disputes`, `Dispute` model |
| No counter-offers | `offers` module: buyer posts, farmer responds |
| No logistics | Full carrier API: trips, bids, proof of handover, GPS, earnings, withdrawals |
| No farmer payout path | `POST /orders/payout-request`, `Payout` model |
| Orders not linked to lots | `cropLotId` flows through `LotDetailPage` and `CheckoutPage` |
| No tests | 10 test files, concentrated in mobile and `mobile-v1` |

Two findings from that draft **do** survive against `main`, verified: the hardcoded admin KPIs, and unbounded overselling. The business-opportunity section largely survives because it did not depend on the code, with one important revision noted in section 6.

---

## 2. What the product actually is

### Role capability map (from controller guards on `main`)

| Capability | Farmer | Buyer | Admin | Carrier |
|---|---|---|---|---|
| Browse marketplace, lot detail | public | public | public | n/a |
| Post lot, manage up to 6 photos | yes | no | yes | n/a |
| Checkout against a specific lot | no | yes | yes | n/a |
| See orders | yes | yes | yes | n/a |
| Advance order stage | no | yes | yes | n/a |
| Make an offer | no | yes | yes | n/a |
| Respond to an offer | yes | no | yes | n/a |
| Escrow balance, request payout | yes | no | yes | n/a |
| Release or refund escrow | no | no | yes | n/a |
| Open or close a dispute | no | no | yes | n/a |
| Role dashboard | `/desk/dashboard` | `/buyer/dashboard` | `/admin/dashboard` | n/a |
| Self-service password change | yes | yes | no | n/a |
| Verify accounts and lots, publish rates, audit log | no | no | yes | n/a |
| Trips, bidding, proof, GPS, earnings, withdrawals | n/a | n/a | n/a | yes |

Carrier accounts are staff-created by design (`CARRIER_INVITE_REQUIRED`), which is the right call for a logistics partner.

### What is genuinely well built

- **Carrier platform.** Trip lifecycle (accept, decline, start, arrive), proof of handover with idempotency keys, location pings, an open job board with bidding, earnings and withdrawals, device registration with refresh tokens and `tokenVersion` revocation. This is the most mature subsystem in the repo.
- **Security hygiene.** Global throttling with tighter limits on auth, boot refusal on a weak `JWT_SECRET`, `ValidationPipe` with `whitelist`, helmet, magic-byte MIME sniffing on uploads, public and private upload purposes separated so farmer identity documents are not publicly readable.
- **KYC modelling.** `KycProfile`, `KycDocument`, `PayoutAccount`, `StaffRole` are the right primitives for a regulated flow.
- **Idempotency.** `IdempotencyRecord` plus `Idempotency-Key` headers on carrier proof and withdrawal. Rare to see this early and it matters for money.
- **Honest comments.** `orders.service.ts:121` states outright that bKash settlement happens outside the system. The code does not pretend.

---

## 3. Critical findings

### 3.1 Fabricated seller reputation, live in production (severe)

`src/market/deriveLots.ts:51` to `:70`:

```ts
const seed = lot.id.split("").reduce((total, character) => total + character.charCodeAt(0), 0);
completedOrders: lot.completedOrders ?? seed % 90,
farmingSince:    lot.farmingSince    ?? 2006 + (seed % 18),
rating:          lot.rating          ?? Math.round((41 + (seed % 9)) / 10 * 10) / 10,
```

Verified: there is **no `Review` or `Rating` model** in the schema, and the backend never sends `rating`, `completedOrders`, or `farmingSince`. So the `??` fallback always wins, and all three values are derived from a character-code sum of the lot's cuid. Rating lands in 4.1 to 4.9, completed orders in 0 to 89, farming-since in 2006 to 2023.

These render as `ratingLabel` beside a star icon, and `filters.rating45Only` filters on the invented number.

Live production, fetched today from the marketplace, all five lots belonging to the same farmer:

```
আলু   · বগুড়া   · Jasim Uddin · ৪.৭ · ৬০
টমেটো · কুষ্টিয়া · Jasim Uddin · ৪.১ · ৯
পেঁয়াজ · পাবনা   · Jasim Uddin · ৪.৬ · ৪১
আলু   · কুষ্টিয়া · Jasim Uddin · ৪.২ · ১০
আলু   · কুষ্টিয়া · Jasim Uddin · ৪.৩ · ৬৫
```

One farmer, five different ratings. That alone proves the number describes a lot id rather than a seller. A genuine seller rating would be identical across that seller's listings.

Why this is the top finding: on a platform where a buyer prepays a stranger for perishable goods, the star rating is the single number they use to decide whom to risk money with. Inventing it is not a cosmetic placeholder, it is a fabricated trust signal presented as a track record, and it also carries consumer-protection exposure in most jurisdictions.

The `??` structure shows real data was intended. Until it exists, the honest options are to hide the rating entirely, or label new sellers as new. The component already has a `"New seller"` branch for `completedOrders === 0`; the fabrication is what prevents it from ever showing.

**Recommendation:** remove the three synthetic fallbacks now, so unrated sellers read as new. Then add a `Review` model written on order completion, and let real ratings appear as they accumulate.

### 3.2 Two domain models that never meet

Confirmed by which Prisma models each module touches:

| Concern | Website uses | Mobile API uses |
|---|---|---|
| Identity | `LegacyUser` | `User` (table `PlatformUser`) |
| Inventory | `CropLot`, `CropLotPhoto` | `Listing`, `ListingPhoto` |
| Offers | `LotOffer` | `Offer` |
| Orders | `LegacyOrder`, `OrderItem` | `Order` |
| Money | `Payment`, `LegacyPayout` | `Escrow`, `Payout` |
| Messaging | `ChatThread`, `ChatMessage` | `Thread`, `ThreadMember`, `Message` |
| Notifications | `LegacyNotification` | `Notification`, `NotificationPref` |
| Audit | `LegacyAuditLog` | `AuditLog` |

`mobile-v1` never touches `cropLot`. The web `lots` and `orders` services never touch `prisma.listing` or the new `prisma.order`. There is no foreign key between `User` and `LegacyUser` and no synchronisation service.

Identity **is** bridged, carefully: mobile registration writes both a `LegacyUser` and a `User` in one transaction, and mobile login authenticates against the legacy record then provisions the platform user. Website registration (`auth.service.ts:193`) creates only a `LegacyUser`.

So a farmer has one login across both surfaces, but **their lots, orders, and money do not cross over.** A lot posted on the website is invisible to the mobile app, and an order placed in the app is invisible to the website and to the admin console that runs on legacy models.

This is a half-finished migration, which is a legitimate state to be in, but it needs a declared direction and a deadline. Two live sources of truth for inventory and money is the kind of thing that produces a reconciliation problem nobody can unwind later. Decide which model wins, write the backfill, and delete the other.

One narrow edge case in the bridge: mobile registration deletes a `REJECTED` website account before recreating it (`mobile-auth.service.ts:76`). `CropLot.farmer` has no cascade, so Prisma's `Restrict` default means that delete throws if such an account holds lots, failing registration with an opaque error. Unlikely, easy to guard.

### 3.3 Ordering never reserves inventory

`LotStatus.RESERVED` and `LotStatus.SOLD` appear in the codebase only as display labels (`lots.service.ts:64` and `:65`). Nothing assigns them. `orders.service.ts` makes zero writes to `cropLot`. Accepting an offer checks `lot.status !== ACTIVE` but does not reserve either.

So quantity is never decremented and the same lot can be sold to any number of buyers. This was already true before escrow existed. Now `Payment` rows go to `HELD` against those sales, so overselling creates a refund obligation rather than just an awkward phone call.

**Fix:** decrement inside the same transaction that creates the order, with a conditional update or version check so two concurrent orders cannot both succeed.

### 3.4 Escrow is a ledger with manual settlement

There is no payment provider integration: no bKash, Nagad, SSLCommerz, or gateway client anywhere in the backend, and no webhook handling. `PayoutMethod` is an enum, payouts are created in state `QUEUED` with `accountNo: "PAYOUT_ACCOUNT_PENDING"`, and the code comment says settlement happens outside the system with staff confirming the transfer.

Starting with a ledger and manual payouts is a reasonable choice, and the code is honest about it. Two consequences to manage:

- The homepage promises payment to bKash or bank **within hours** of delivery confirmation, and the payout notification repeats it. That is a staffing commitment, not a system guarantee. It holds at ten orders a day and breaks at a hundred.
- Money held on behalf of users, settled by hand, with no provider of record, is the configuration regulators care about. Confirm the licensing position with a Bangladeshi financial-services advisor before volume grows. I have not verified current Bangladesh Bank requirements.

### 3.5 The admin console still shows invented numbers

`AdminPanels.tsx:25` imports `dashboardStats`, `adminRoutes`, `adminPriceSignals`, `lots`, and `orders` from `src/data.ts`, and `StatsPanel` renders `dashboardStats` directly. So an admin still sees "GMV today ৳4.82L", "18 orders confirmed", a payout queue of "৳82,000", and four trucks in motion with driver names and temperatures. All constants.

Meanwhile `GET /admin/dashboard` exists and the web frontend never calls it. (`"/admin/dashboard"` in `data.ts` and `App.tsx` is a frontend route path, not the API.)

The homepage and `/prices` were fixed: they now call `fetchPlatformStats` and `fetchPublishedRates`. The admin console is the remaining surface where fabricated figures are presented as live, and it is the surface an operator would make decisions on. Rate trend sparklines still come from a static `rateHistory` module.

### 3.6 Production data is still developer test data

Every one of the 9 live listings belongs to "Jasim Uddin", each shows "০ %" against market because no rate is populated for the crop and district, and each shows "পিকআপের তথ্য নেই" (no pickup information) despite the carrier platform existing. A first-time buyer sees a nine-listing market run by one person with no price context and no delivery information.

---

## 4. Per-role assessment

**Farmer.** Structurally complete: post with photos, respond to offers, see orders, watch escrow, request payout, dedicated `/desk` dashboard. Gaps: no real reputation to earn (3.1), price guidance depends on rates that are largely unpopulated, and lots are never marked sold so the desk cannot show what is still available.

**Buyer.** The flow works end to end: marketplace, lot detail, checkout against a specific lot, order tracking, offers, dispute path. The decisive gap is trust. The verified badge is real (`lots.service.ts:164` blocks unverified farmers from publishing), but the rating next to it is not, which devalues the badge that *is* real. Market comparison showing "০ %" on every lot removes the price anchor a new buyer needs.

**Admin.** Strong on account and lot verification, rate publishing, escrow and dispute decisions, audit log. Weak where it matters most for operations: the dashboard is fake, the legacy and platform split means the console only sees half the business, and payout settlement is manual with no reconciliation view.

**Carrier.** Well built and, judging by "no pickup information" on every live lot, not yet in use.

---

## 5. Technical risks, ranked

1. Fabricated ratings shown to buyers (3.1).
2. Two live domain models with no synchronisation (3.2).
3. No inventory reservation, now with money attached (3.3).
4. Manual settlement presented as hours-fast, with licensing unconfirmed (3.4).
5. Admin decisions taken against hardcoded figures (3.5).
6. Thin tests where risk is highest. 10 test files exist, concentrated in mobile and `mobile-v1`; the web order, escrow, and offer paths are effectively untested. Money and role transitions are exactly what must not regress silently.
7. Uploads still stored as `Bytes` in PostgreSQL and streamed through Node. Every image view is a database read plus a full buffer in application memory, with no CDN. Move to object storage with signed URLs.
8. API on a Render free instance. It answered in 0.24 s warm during testing, but free instances sleep, and a cold marketplace that renders empty loses first-time visitors permanently.
9. Swagger appears to be served unconditionally at `/api/docs`. Gate it in production.
10. No structured logging, error tracking, or metrics.
11. No terms, privacy, or refund policy in the sitemap, on a platform that holds funds and identity documents.

---

## 6. Business opportunities

Revised now that the real codebase is visible. The largest change from the earlier draft: **logistics is built, not missing.**

### 6.1 Activate the carrier platform (highest value, lowest marginal cost)

Trip lifecycle, bidding, proof of handover, GPS, earnings, and withdrawals already exist, and every live lot says "no pickup information". Aggregating small lots into full truckloads along one corridor is where the margin in Bangladeshi agri actually sits, and reducing post-harvest loss creates value rather than redistributing it. This is the one opportunity where the engineering is already paid for and only operations are missing. Start with one corridor and a handful of partner trucks.

### 6.2 The price data asset

`MarketRate`, `RateFeed`, and admin rate publishing exist, and `/prices` is wired to them, but coverage is thin enough that every lot shows "০ %" against market. Fill the rates first, because they are load-bearing for buyer trust, farmer price guidance, and the "০ %" embarrassment all at once. Then: free tier for organic acquisition on Bengali crop-price queries, paid API and district index for processors, exporters, agri lenders, and insurers. That sells without marketplace liquidity. The missed-call SMS service is the acquisition channel for feature-phone farmers and a candidate for telco revenue share.

### 6.3 Real reputation as a product

Fixing 3.1 properly unlocks more than trust. Verified completion history feeds a grading and certification service, preferential placement for reliable farmers, and eventually the credit signal below. Build the `Review` model as an asset, not a patch.

### 6.4 Transaction-history farmer credit

Verified order history is a credit signal for a population largely unbanked for production credit. Do not lend: originate and refer to MFIs, banks, and mobile financial services, and take a fee. Gated on 3.2 and 3.3, because a credit file cannot be built on two unreconciled ledgers.

### 6.5 Commission

The model the product is shaped around. It works once escrow settles reliably, disputes resolve, and inventory is trustworthy. Ranked here deliberately: pressing commission before those hold is how agri marketplaces fail.

### 6.6 Buyer subscriptions

Hotels, processors, retail chains, and caterers will pay monthly for guaranteed supply, consistent grading, scheduled delivery, and consolidated invoicing. Recurring revenue, easier to forecast than commission, and it turns a spot market into supply contracts. `Listing` plus the carrier platform already support the mechanics.

### 6.7 Inputs marketplace

Seed, fertilizer, and pesticide vendors will pay for access to verified farmers. Pairs naturally with credit: finance the input against the expected harvest sale.

### 6.8 The liquidity problem

Nine listings from one farmer is pre-liquidity. Two-sided cold start is why most agri marketplaces die. The realistic path stays the same: be the buyer for one crop in one corridor, take inventory risk, prove unit economics, then open up. Price data and SMS run in parallel as the cheap funnel.

---

## 7. Roadmap

**Immediate, days**

1. Remove the synthetic `rating`, `completedOrders`, and `farmingSince` fallbacks so unrated sellers read as "New seller".
2. Reserve inventory inside the order transaction, and assign `RESERVED` and `SOLD`.
3. Replace or seed the "Jasim Uddin" production data.
4. Populate market rates for the live crops and districts so "০ %" disappears.
5. Deploy the SEO and CSP fix on `fix/seo-trailing-slash-and-csp-fonts`, which stops `/marketplace/` and `/prices/` serving `noindex, nofollow`.

**Next, 4 to 8 weeks**

6. `Review` model written on order completion; surface real ratings.
7. Decide the winning domain model, write the backfill, set a date to delete the loser.
8. Wire the admin console to `GET /admin/dashboard`; delete every hardcoded panel or give it an explicit empty state.
9. Tests around escrow, order advancement, offers, and role guards.
10. Activate the carrier platform on one corridor.

**Following quarter**

11. Payment provider integration so settlement is not manual, with the licensing question answered first.
12. Object storage plus CDN for uploads; always-on API instance.
13. Publish terms, privacy, and refund policy.
14. Price API as a product.

---

## 8. Limitations

- Findings are against `origin/main` at `7338aef` plus live probing. If `main` has moved, re-verify.
- I did not log in as buyer, farmer, admin, or carrier. The role table comes from controller guards and route definitions, not from exercising each flow. Authenticated UI may differ from what the guards permit.
- The carrier platform being unused is inferred from "no pickup information" on every live lot plus the absence of carrier surfaces in the web app. I did not confirm it against the database.
- Market sizing, competitive positioning, and the regulatory statements are informed judgement, not researched figures. The Bangladesh Bank licensing question in 3.4 needs a local advisor.
- Post-harvest loss and unbanked-farmer context is approximate, not cited.
