# Payments (stream E)

Spec: `docs/SPEC.md` sections 4.11, 9 (checkout, verify, portal, webhook), 10, 17.2. Look: `docs/design/ref-quizlet.md` (plan cards, timeline), `docs/design/style-guide.md`.

## Files

| File | What it does |
|---|---|
| `plans.ts` | Prices, names, renewal terms, capability check (`hasCapability`). Shared by server and screens |
| `gateway.ts` | Official `stripe` SDK (hosted Checkout, inline `price_data`, portal configuration created by code) and a mock gateway |
| `access.ts` | Paid Checkout Session → access row (`grantPaidAccess`), subscription refresh, `accessFor(familyId)` |
| `server.ts` | Base URL, session look-up, error mapping for the routes |
| `client.ts` | Browser calls: `paymentsApi.checkout / verify / portal`, the `bds:entitlements` event |
| `components/paywall/*` | `Paywall`, `PlanCard`, `PlanTimeline`, `TestCardBox`, `PaidScreen`, `SubscriptionCard` (Settings), `UpgradeOffer` (badge screen) |
| `app/event/[id]/paywall`, `app/paid` | The two screens |

## Modes

- `STRIPE_SECRET_KEY=sk_test_…` → real Stripe test mode. A live key (`sk_live_…`) is refused.
- No key in development and tests → mock: checkout "pays" at once and returns to `/paid`. In a production build the mock runs only with `STRIPE_MOCK=on` (for a demo server without a key); otherwise the paywall says payments are not set up.
- `STRIPE_WEBHOOK_SECRET` set → `/api/stripe/webhook` handles `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`.

## For other streams

- Use `accessFor(familyId)` from `access.ts` where access is checked (`/api/chapter`, `/api/ritual`, `/api/state`): it refreshes subscription rows that end within 3 days, then returns `listEntitlements`.
- `/api/verify` returns `{ entitlements, purchase: { plan, eventId? } }`; `purchase` is an addition to SPEC 9 so `/paid` knows where to send the parent.
- `/paid` fires `window` event `bds:entitlements` with the fresh list; the browser store can listen to it.
- The jury's "Skip payment (demo access)" button goes into `Paywall`'s `demoSlot` (stream G owns `/api/sample/access`).
- Settings shows `<SubscriptionCard workspace entitlements />`; the badge screen shows `<UpgradeOffer workspace eventId entitlements />`.

## Stripe dashboard (test mode), after the deploy

1. Developers → Webhooks → add endpoint `https://<domain>/api/stripe/webhook` with the three events above; put its signing secret into `STRIPE_WEBHOOK_SECRET`.
2. Settings → Billing → Subscriptions and emails → turn on "Send emails about upcoming renewals" (30 days). This is the renewal reminder promised on the paywall. Stripe sends no emails in test mode.
3. Optional: Settings → Branding (logo, colours); Apple Pay, Google Pay and Link in payment methods (SPEC 10.7).

## Defaults chosen, to revisit with Lida

1. Names on screen follow SPEC 17.2: **Big Day Pass** ($9.99 once) and **Gold** ($49 a year, or $7.99 a month as a toggle inside the Gold card). Stored plan ids stay `event | year | month`.
2. No free trial for Gold. The "How it works" timeline shows the charge today, the reminder 30 days before renewal and the renewal date. A 7-day trial (as in the Quizlet reference) is a later option.
3. The renewal reminder relies on Stripe's upcoming-renewal emails (dashboard switch above), not on our own email.
4. Cancel happens in the Stripe customer portal at the period end; access stays until then. Refunds are handled by hand in the dashboard.
5. A family that already has Gold cannot buy a Big Day Pass or a second subscription (409).
