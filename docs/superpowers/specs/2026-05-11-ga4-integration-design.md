# GA4 integration — dinkbit.es

**Status:** approved
**Date:** 2026-05-11
**Property:** dinkbit.es — Web (Measurement ID `G-Q4Q24B5K6Y`)

## Goal

Add Google Analytics 4 to dinkbit.es with:

1. GDPR-compliant consent handling via Google Consent Mode v2, wired to the existing cookie banner.
2. Automatic `page_view` tracking on every client-side navigation.
3. Conversion event (`generate_lead`) on both contact forms.
4. Outbound interaction events (`phone_call`, `email_click`, `whatsapp_click`) on all `tel:` / `mailto:` / WhatsApp links.
5. New floating WhatsApp bubble (fixed bottom-right) to give the WhatsApp action a persistent surface.

Tracking is fully no-op when `NEXT_PUBLIC_GA_ID` is unset.

## Architecture

### Approach

- **Consent Mode v2 inline init** — `gtag.js` is always loaded, with consent default `denied`. Consent is updated to `granted` per category when the user accepts in the existing banner. This preserves Google's conversion modelling while respecting GDPR.
- **Delegated click listener** for outbound links — one global `document` listener routes clicks on `tel:` / `mailto:` / `wa.me` anchors to GA events. No per-link instrumentation, no risk of forgetting to wrap a new link.
- **Explicit form tracking** — `HeroForm` and `ContactForm` call `track('generate_lead', { form_location })` after their server action returns `ok: true`.

### Files

#### New

- **`src/lib/gtag.ts`** — typed helpers. Exports:
  - `GA_ID: string | undefined` — reads `process.env.NEXT_PUBLIC_GA_ID`.
  - `isEnabled(): boolean` — true iff `GA_ID` is set and running in browser.
  - `setConsent(state: ConsentState | null)` — maps app `ConsentState` → Google consent params and calls `gtag('consent', 'update', ...)`.
  - `pageview(url: string)` — `gtag('event', 'page_view', { page_path: url, page_location: window.location.href })`.
  - `track(name: string, params?: Record<string, unknown>)` — `gtag('event', name, params)`.
  - All exports are no-op when `!isEnabled()` or when `window.gtag` is undefined.
  - No `any`. Declare `gtag` and `dataLayer` globals via a local type augmentation.

- **`src/components/analytics/GA4.tsx`** — client component. Behavior:
  - If `!GA_ID` → returns `null`.
  - Renders two `<Script>` tags:
    - `id="ga-consent-default"`, `strategy="beforeInteractive"`, inline body initializing `dataLayer`, defining `gtag`, pushing `consent default` (all denied, `wait_for_update: 500`), `js`, and `config` with `{ anonymize_ip: true, send_page_view: false }`.
    - `src="https://www.googletagmanager.com/gtag/js?id=G-..."`, `strategy="afterInteractive"`.
  - `useEffect` on mount: read `readConsent()` and call `setConsent(state)`.
  - Subscribes to `CONSENT_CHANGED_EVENT` and calls `setConsent` on changes.
  - `usePathname()` + `useSearchParams()` effect: on each pathname/search change, call `pageview(pathname + searchString)`. This replaces the disabled auto `send_page_view`.

- **`src/components/analytics/LinkTracker.tsx`** — client component, renders `null`. On mount installs `document.addEventListener('click', handler, { capture: true })`. Handler:
  - `const a = (e.target as Element).closest?.('a')` — bail if none.
  - Branch on `a.href`:
    - starts with `tel:` → `track('phone_call', { link_location, link_url })`.
    - starts with `mailto:` → `track('email_click', { link_location, link_url })`.
    - includes `wa.me` or `api.whatsapp.com` → `track('whatsapp_click', { link_location, link_url })`.
  - `link_location` derived from nearest ancestor among `header`, `footer`, otherwise `'page'` (use `closest('header,footer')`).
  - `link_url` is `a.getAttribute('href')`.
  - Cleanup removes listener.

- **`src/components/layout/WhatsAppBubble.tsx`** — server component (no client interactivity needed; click tracking is delegated):
  - Renders a fixed positioned `<a>` (bottom-right, e.g. `fixed bottom-5 right-5 z-40`) with WhatsApp SVG icon, `href={CONTACT_INFO.socials.whatsapp}`, `target="_blank"`, `rel="noopener noreferrer"`, `aria-label="WhatsApp"`.
  - Tailwind styles consistent with site: circular, brand-tinted background, subtle shadow, hover lift. No motion library dependency required.
  - Hidden under the cookie banner stacking? Cookie banner uses a higher z-index — verify and pick z-index below it (banner currently `z-50`; bubble at `z-40`).

#### Modified

- **`src/app/layout.tsx`** — mount three new elements inside `<body>`:
  - `<GA4 />` (can sit anywhere; ideally before `</body>`).
  - `<LinkTracker />`.
  - `<WhatsAppBubble />`.
  - No change to `<Analytics />` (Vercel Analytics) — left as-is.

- **`src/components/home/HeroForm.tsx`** — inside the `startTransition` callback, after `setResult(r)`, if `r.ok` call:
  ```ts
  track('generate_lead', {
    form_location: 'hero_home',
    service: String(fd.get('service') ?? ''),
  });
  ```

- **`src/components/contacto/ContactForm.tsx`** — same pattern, with `form_location: 'contact_long'`.

#### Unchanged

- `src/lib/cookies-consent.ts` — public surface (`readConsent`, `writeConsent`, `CONSENT_CHANGED_EVENT`) already matches what `GA4.tsx` needs.
- `src/components/analytics/Analytics.tsx` — still gates Vercel Analytics with the strict "don't load until accepted" pattern. GA4 uses a different pattern (Consent Mode v2) and lives as a separate component. They do not conflict.
- `src/components/legal/CookieBanner.tsx` — no changes; consent events already fire correctly.

## Consent mapping

| App `ConsentState` field | Google consent key(s) |
| --- | --- |
| `analytics` | `analytics_storage` |
| `marketing` | `ad_storage`, `ad_user_data`, `ad_personalization` |

`true` → `'granted'`, `false` → `'denied'`. When `readConsent()` returns `null` (no decision yet), defaults stay `denied`.

## Events

| Event | Trigger | Parameters |
| --- | --- | --- |
| `page_view` | Mount + every pathname/search change | `page_path`, `page_location` |
| `generate_lead` | `HeroForm` submit ok | `form_location: 'hero_home'`, `service` |
| `generate_lead` | `ContactForm` submit ok | `form_location: 'contact_long'` |
| `phone_call` | Click on any `a[href^="tel:"]` | `link_location`, `link_url` |
| `email_click` | Click on any `a[href^="mailto:"]` | `link_location`, `link_url` |
| `whatsapp_click` | Click on any `a[href*="wa.me"]` or `a[href*="whatsapp"]` | `link_location`, `link_url` |

`generate_lead` is a Google recommended event; mark it as a conversion in GA4 admin after first events arrive.

## Environment

- `NEXT_PUBLIC_GA_ID=G-Q4Q24B5K6Y` in Vercel for **Production**.
- Optional in **Preview** if QA via preview deploys is desired. Recommended off in Preview to avoid noisy data.
- Local dev: leave unset → all GA code is no-op.

## Testing

### Automated (vitest)

- `src/lib/gtag.test.ts` — covers:
  - `isEnabled()` returns `false` when `NEXT_PUBLIC_GA_ID` is unset.
  - `track()` is a no-op when disabled (does not throw, does not push).
  - `track()` pushes to `dataLayer` when enabled.
  - `setConsent(null)` → all categories denied.
  - `setConsent({ analytics: true, marketing: false, ... })` → analytics granted, ad_* denied.
  - `setConsent({ analytics: true, marketing: true, ... })` → all granted.

No other automated tests added; the rest is browser-integration territory.

### Manual verification (post-deploy)

1. Open production with cookies cleared. Confirm `gtag.js` loads and `Network → collect` shows no event before consent.
2. Accept all in banner → see `collect` events fire (page_view).
3. Reject all → consent updates, subsequent navigation does not fire events.
4. Submit HeroForm → see `generate_lead` event with `form_location: hero_home`.
5. Submit ContactForm at `/contacto` and at home bottom → see `generate_lead` with `form_location: contact_long`.
6. Click phone, mail, WhatsApp bubble, WhatsApp header link → see corresponding events with correct `link_location`.
7. Run a Realtime report in GA4 to confirm everything arrives.

## YAGNI / explicitly out of scope

- No Google Tag Manager. Direct gtag.js only.
- No scroll / video / file download tracking — covered by GA4 Enhanced Measurement at property level.
- No server-side tracking.
- No additional analytics destinations (Plausible, Posthog, etc).
- No A/B testing wiring.
- No cookie banner changes beyond what already exists.

## Open risks

- **z-index of WhatsApp bubble vs cookie banner** — banner sits at `z-50`. Bubble at `z-40` will sit under it; on first visit the bubble is partially obscured by the banner. Acceptable: banner is dismissed on first interaction.
- **Consent Mode v2 inline script ordering** — `beforeInteractive` is required so consent defaults are pushed before gtag.js loads. Verify in production that the inline script is actually emitted in `<head>` before the gtag.js src tag.
- **App Router + searchParams in `<GA4 />`** — `useSearchParams()` forces the component (and ancestors up to a Suspense boundary) into a dynamic render. Mitigation: wrap the page_view-firing logic inside its own client child wrapped in `<Suspense>` so the rest of `layout.tsx` stays static-friendly. Confirm during implementation.
