# AmarKrishok — design-handoff implementation, work-in-progress notes

Context for whoever picks this up next. The task was: take
`~/Downloads/design_handoff_amarkrishok/AmarKrishok Web App.dc.html` (a clickable HTML
prototype) and reproduce its functionality **and** its visual design in this codebase,
adjusting the backend where the demo needs data we did not serve.

Everything below is pushed to `origin/main`. 21 commits, ~10,700 insertions across 55 files.

---

## 1. Read this first — the environment problem

**No build has ever succeeded on this machine.** `tsc`, `vite build` and the dev server all
stall at 0 % CPU indefinitely. Cause: the repo lives in `~/Desktop`, which iCloud Drive
syncs, including `node_modules`. `bird` and `fileproviderd` saturate disk I/O and starve
every toolchain process. Installing the font packages made it markedly worse.

```bash
mv ~/Desktop/amar-krishok ~/dev/amar-krishok      # then reinstall and build normally
```

Until that is done, the only verification available is:

```bash
./node_modules/.bin/esbuild src/App.tsx --jsx=automatic --outfile=/dev/null            # parses a file
./node_modules/.bin/esbuild src/styles.css --bundle --outfile=/dev/null \
  "--external:/assets/*" --loader:.woff2=empty                                          # parses the CSS
```

These catch syntax and CSS errors. They do **not** catch type errors or anything visual.
Netlify's build log has been the real check throughout.

---

## 2. What the demo is, and the method that actually worked

The prototype is one HTML file with **869 elements carrying inline `style="..."`
attributes**. Those attributes are the specification — the bundled `README.md` only
summarises them, and working from the README produced systematically wrong output
(approximated `rem` sizes, weights at 850 where the demo uses 600, a 1480px container
against the demo's 1280px).

The method that worked, and should be continued:

```bash
cd "/Users/mdjasimuddin/Downloads/design_handoff_amarkrishok"
python3 - <<'PY'
import re
src = open("AmarKrishok Web App.dc.html", encoding="utf-8").read()
body = src[src.index("<x-dc"):src.index("</x-dc>")]
i = body.index("SOME UNIQUE STRING FROM THE SCREEN")     # e.g. "Is this a fair price?"
for m in re.finditer(r'<(\w+)[^>]*style="([^"]+)"', body[i-500:i+1500]):
    print(f"{m.group(1):6s} {m.group(2)}")
PY
```

Screens are delimited by `<sc-if value="{{ isX }}">` guards:
`isHome · isMarket · isListing · isCheckout · isConfirm · isOrders · isOrder · isRates ·
isFarmer · isPost · isAdminRoute · isLogin · isRegister · isLogout · isSignedOut`.

**The other two JS files in that folder are not app code.** `support.js` is the prototyping
runtime (`GENERATED … do not edit`) and `image-slot.js` is a placeholder web component. The
README says explicitly not to carry them over.

`AmarKrishok Redesign.dc.html` in the same folder holds the **mobile app mockups** (farmer,
buyer, logistics) plus the original admin cockpit. Only one requirement was taken from it —
see §6.

---

## 3. Architecture of what was added

### Frontend — the market layer

| File | Purpose |
|---|---|
| `src/market/marketData.ts` | Units (1 mon = 40 kg), `taka()`, fair-band constants, escrow stages, payment methods, cost maths |
| `src/market/marketTypes.ts` | `MarketLot`, `MarketLotSource`, `MarketFilters` |
| `src/market/deriveLots.ts` | Turns a `CropLot` into a `MarketLot`: price per mon, delta vs district rate, verification, suspension |
| `src/market/useMarket.ts` | `useMarketLots`, `useLoadRates`, `useRateChanges`, `useRateSeries` |
| `src/store/useMarketStore.ts` | Zustand: cached rates + **UI-only** state (filters, sort, SMS alerts). Only `alerts` is persisted |
| `src/api/market.ts` | All market endpoints |

**Key principle:** deltas, verification badges and suspension are *derived*, never stored.
A staff rate publish or verification decision therefore propagates to every surface for free.
Verification reads `lot.farmer.status === "ACTIVE"`; suspension reads `lot.status !== "ACTIVE"`.

### Frontend — screens

New: `LotDetailPage`, `CheckoutPage`, `OrdersPages` (list + tracking + placed),
`SignedOutPage`, `SiteFooter`, `components/market/*`, `pages/admin/MarketSection`,
`pages/farmer/FarmerMarketPanels`.

Routes added in `App.tsx`: `/lot/:lotId`, `/checkout/:lotId`, `/orders`,
`/orders/:orderId`, `/orders/:orderId/placed`, `/signed-out`.

### Backend (NestJS + Prisma)

| Module | Endpoints |
|---|---|
| `modules/offers` | `GET /api/offers`, `POST /api/offers`, `PATCH /api/offers/:id/respond` |
| `modules/orders` | `+ PATCH :id/advance`, `PATCH :id/escrow`, `PATCH :id/dispute`, `GET farmer-escrow`, `POST payout-request` |
| `modules/market-prices` | `+ GET rates` (public), `POST publish` (admin), `RatesBootstrapService` |
| `modules/stats` | `GET /api/stats/platform` (public) |

Schema (migration `20260805223000_add_lot_offers_and_escrow`, **applied successfully on
Render**): new `LotOffer` model + `OfferStatus` enum; `Order.disputeOpenedAt`;
`Payment.transportFee / platformFee / method / releasedAt / refundedAt`.

Escrow maps onto the existing `OrderStatus` rather than a parallel column — see
`backend/src/modules/orders/escrow.ts`. Releasing writes `Payout` rows per farmer.

---

## 4. Design system

`src/styles.css` is ~9,800 lines: an older layer plus successive override blocks appended
at the end. **Later blocks win**; that is how the restyle was applied without rewriting the
original. The demo's values, all verified from its inline styles:

- **Type scale is px, not rem**: 11/12/13/14/15/16/17/18/19/20/22/24/26/28/30/32/50.
  Dominated by 14, 13, 12, 15, 11.
- **Weights**: 600 is the workhorse (178 uses), 700 for stronger, 800 three times only.
- **Palette**: `#111827` `#374151` `#4B5563` `#6B7280` `#9AA3AF` fg ladder;
  `#F5F7FA` bg, `#FFFFFF` surface, `#F1F3F6` sunken, `#E2E5EB` border, `#C5CAD3` border-strong;
  `#146B45` / `#0F5636` brand green; `#CC0001` / `#A80001` **commit-action red**;
  `#1C69D4` / `#DBEAFE` interactive blue; `#15803D`/`#DCFCE7` good, `#B45309`/`#FEF3E2` warn.
- **Radii**: 6px inputs, 8px buttons/cards, 12px feature cards, 999px pills.
- **Elevation: none.** A card is a 1px border. 76 drop-shadows were removed.
- **Container**: 1280px with 24px gutters → 1232px content column.
- Fonts self-hosted via `@fontsource` (imported in `src/main.tsx`) because the CSP is
  `font-src 'self'`. Inter 400–800, JetBrains Mono 500/600, Noto Sans Bengali 400/600.

**Colour rules that are easy to get wrong** (all were bugs at some point):
- Red `#CC0001` is for *committing money* — "Order now", "Pay into escrow", "Sign up free".
  Green is for farmer actions. They are not interchangeable.
- Filter checkboxes and grade pills select **blue**, not green.
- Filter rail sections divide on `#F1F3F6`, not the card border.

---

## 5. Bugs found only from screenshots — expect more of these

Markup-reading cannot find these; they came from old CSS the override blocks did not reach.
If something looks wrong, **get a screenshot** rather than re-reading the demo.

Fixed so far: invisible red button (`.danger-button` sets red text; the fill was changed to
red, leaving red-on-red) · a third login control (`hidden` attribute loses to
`display: inline-flex`) · hero reserving 300px of empty height (`min-height` on `h1`) ·
how-it-works band 24px off the hero's grid · header white clipped at 1280px instead of
full-bleed · rate ticker pinned when the demo's is not · lot photo escaping its 130px box
and covering the crop title.

---

## 6. What is NOT done

### Deliberate departures — decisions for the client, not bugs

1. **OTP login / 3-step register.** The demo authenticates with a 4-digit SMS code and sets
   `user.admin` client-side. This app authenticates against the backend with a server-checked
   role. Swapping it would let anyone grant themselves the admin console, which controls
   escrow release on real money. The handoff's own README says the prototype's approach
   "must not be how authorisation works in production". The *visual* treatment (phone-first
   layout, `+880` prefix, role segmented control) could still be built over the existing auth.
2. **Logistics signup role.** No such role in the schema, no partner surface to send them to.
3. **Withdraw to bKash** records a payout request and notifies staff; it deliberately does
   **not** move money. Real disbursement needs a bKash merchant integration.
4. **Hero stat figures.** The demo's "8,400+ farmers / 42 markets / 1 h 48" are invented.
   Ours come from `GET /api/stats/platform` and currently read 3 / 10. Do not hardcode the
   demo's numbers without the client's say-so — they would be false claims on the front page.
5. **Notification bell and Chat bubble** are this app's features, absent from the demo. Kept.

### The mobile mockups (`AmarKrishok Redesign.dc.html`) — largely untouched

Only the README's explicit requirement was implemented: *below 768px the dense tables become
card lists*. Not built: the mobile farmer app (bottom nav Home/Orders/Rates/Profile), the
mobile buyer app (Browse/Orders/Rates/Account), the logistics driver app (Jobs/Active/
Earnings, proof-of-pickup, weighed quantity). These are separate product surfaces with their
own information architecture — building them changes how every existing user navigates on a
phone. Needs a product decision first.

### Value-for-value pass — screens still unverified against the demo

Done: hero, cheapest-lots, how-it-works, ticker, footer, marketplace rail, lot cards, lot
detail, order box, escrow explainer, checkout, orders table, tracking timeline, rates,
farmer desk.

**Not yet done: the admin console** (`MarketSection.tsx` + `AdminPage.tsx`). Extract from
the demo's `isAdminRoute` guard — it has a pill tab bar, four KPI cards, a "what staff can
change here" list, a rate-integrity panel with traffic-light dots, and per-row escrow
actions. The demo's admin table grid is `110px minmax(200px,1fr) 130px 120px 120px 210px`.

### Loose ends

- `i18n.tsx` has ~1,117 Bangla keys. Any new UI string needs an entry; check for duplicates
  with the script pattern used throughout (duplicate keys are a TS error).
- The ticker shows `0.0 %` until a second day of rates exists. This is correct, not a bug —
  the seed writes one day on an already-seeded database. Do not backfill fake history.
- `medianReleaseMinutes` is `null` until a payment is actually released; the hero hides that
  stat rather than inventing a figure. Keep that behaviour.

---

## 7. Verification checklist before the next deploy

```bash
npm run build                       # tsc -b && vite build — the real check
cd backend && npx prisma generate && npm run build
curl -s https://amar-krishok-api.onrender.com/api/market-prices/rates    # should list 10 crops
curl -s https://amar-krishok-api.onrender.com/api/stats/platform
```

Deploys are automatic on push to `main`: Netlify builds the frontend, Render runs
`prisma migrate deploy` then builds the backend.
