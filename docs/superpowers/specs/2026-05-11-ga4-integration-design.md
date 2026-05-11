# GA4 via GTM — dinkbit.es

**Status:** approved (v2 — switched to GTM 2026-05-11)
**Date:** 2026-05-11
**Container:** Google Tag Manager `GTM-KTJFRZKP`
**Property:** dinkbit.es — Web (GA4 Measurement ID `G-Q4Q24B5K6Y`, configured **inside GTM** — not in code)

## Goal

Add Google Analytics 4 to dinkbit.es via **Google Tag Manager**, with:

1. GDPR-compliant consent handling via Google Consent Mode v2, wired to the existing cookie banner.
2. Automatic `page_view` tracking on every client-side navigation (handled inside GTM via History Change trigger; no React code).
3. Conversion event (`generate_lead`) on both contact forms.
4. Outbound interaction events (`phone_call`, `email_click`, `whatsapp_click`) on all `tel:` / `mailto:` / WhatsApp links.
5. New floating WhatsApp bubble (fixed bottom-right) to give the WhatsApp action a persistent surface.

Tracking is fully no-op when `NEXT_PUBLIC_GTM_ID` is unset.

## Architecture

### Approach

- **Google Tag Manager container** — load `GTM-KTJFRZKP` head script + body noscript fallback. All GA4 configuration and tag firing rules live in the GTM UI; the GA4 Measurement ID `G-Q4Q24B5K6Y` is configured there.
- **Consent Mode v2, inline before GTM loads** — push consent defaults to `dataLayer` (all categories `denied`, `wait_for_update: 500`) BEFORE the GTM init script runs. GTM and every tag inside it honor those defaults. On consent change we push a consent update.
- **Events via `dataLayer.push`** — React fires events as `dataLayer.push({ event: '<name>', ...params })`. GTM Custom Event triggers route them to GA4 Event tags.
- **Delegated click listener** for outbound links — one global `document` listener pushes `phone_call` / `email_click` / `whatsapp_click` events. No per-link instrumentation.
- **Explicit form tracking** — `HeroForm` and `ContactForm` push `generate_lead` after their server action returns `ok: true`.
- **No page_view code** — GTM's built-in History Change trigger fires on Next.js App Router `pushState`/`replaceState`. A GA4 Event tag of type `page_view` is wired to it inside GTM.

### Files

#### New

- **`src/lib/gtm.ts`** — typed helpers. Exports:
  - `GTM_ID: string | undefined` — reads `process.env.NEXT_PUBLIC_GTM_ID`.
  - `isEnabled(): boolean` — true iff `GTM_ID` is set and running in browser.
  - `dataLayerPush(payload: Record<string, unknown>)` — pushes to `window.dataLayer`, no-op when disabled or `dataLayer` unavailable.
  - `track(name: string, params?: Record<string, unknown>)` — wrapper around `dataLayerPush({ event: name, ...params })`.
  - `setConsent(state: ConsentState | null)` — pushes a Google Consent Mode v2 `consent update` to `dataLayer` (via the `gtag` shim defined in the inline init script). Maps `state.analytics` → `analytics_storage`, `state.marketing` → `ad_storage` + `ad_user_data` + `ad_personalization`. `null` → all denied.
  - No `any`. Local `declare global` for `window.dataLayer` and `window.gtag`.

- **`src/components/analytics/GTM.tsx`** — client component. Behavior:
  - If `!GTM_ID` → returns `null`.
  - Renders three things:
    1. `<Script id="gtm-consent-default" strategy="beforeInteractive">` — inline body:
       ```js
       window.dataLayer = window.dataLayer || [];
       window.gtag = function(){ window.dataLayer.push(arguments); };
       gtag('consent', 'default', {
         ad_storage: 'denied',
         ad_user_data: 'denied',
         ad_personalization: 'denied',
         analytics_storage: 'denied',
         wait_for_update: 500,
       });
       ```
    2. `<Script id="gtm-init" strategy="afterInteractive">` — inline body containing the standard GTM loader snippet, parameterised to `GTM_ID`.
    3. `<noscript>` with the fallback iframe pointing to `https://www.googletagmanager.com/ns.html?id=${GTM_ID}`.
  - `useEffect` on mount: read `readConsent()` and call `setConsent(state)`.
  - Subscribes to `CONSENT_CHANGED_EVENT` and calls `setConsent` on changes.
  - No pathname/searchParams effect — page_view is handled in GTM.

- **`src/components/analytics/LinkTracker.tsx`** — client component, renders `null`. On mount installs `document.addEventListener('click', handler, { capture: true })`. Handler:
  - `const a = (e.target as Element).closest?.('a')` — bail if none.
  - Branch on `a.href`:
    - starts with `tel:` → `track('phone_call', { link_location, link_url })`.
    - starts with `mailto:` → `track('email_click', { link_location, link_url })`.
    - includes `wa.me` or `api.whatsapp.com` → `track('whatsapp_click', { link_location, link_url })`.
  - `link_location` derived from nearest ancestor among `header`, `footer`, else `'page'`.
  - `link_url` is `a.getAttribute('href')`.
  - Cleanup removes listener.

- **`src/components/layout/WhatsAppBubble.tsx`** — server component:
  - Fixed positioned `<a>` (`fixed bottom-5 right-5 z-40`), WhatsApp SVG icon, `href={CONTACT_INFO.socials.whatsapp}`, `target="_blank"`, `rel="noopener noreferrer"`, `aria-label="WhatsApp"`.
  - Circular, brand-tinted background, subtle shadow, hover lift. No motion library dependency required.
  - z-index 40, below cookie banner (z-50). Banner is dismissed on first interaction, so post-decision the bubble is visible.

#### Modified

- **`src/app/layout.tsx`**:
  - Inside `<head>`: mount `<GTM />` (the component places its `beforeInteractive` and `afterInteractive` scripts; `beforeInteractive` requires component to be inside `<head>` or rendered at the document root before `<body>`).
  - Inside `<body>` as the first child: render the GTM `<noscript>` iframe element. (Implementation note: we can render `<GTM />` once and split its output, OR have `<GTM />` only emit the head scripts and add a second tiny server component `<GTMNoScript />` that we render at top of `<body>`. We will use the second pattern for clarity.)
  - Mount `<LinkTracker />` near end of `<body>`.
  - Mount `<WhatsAppBubble />` near end of `<body>`.
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

- `src/lib/cookies-consent.ts` — `readConsent`, `CONSENT_CHANGED_EVENT` already match.
- `src/components/analytics/Analytics.tsx` — still gates Vercel Analytics. Does not conflict with GTM.
- `src/components/legal/CookieBanner.tsx` — no changes; existing consent events drive GTM consent updates.

## Consent mapping (Google Consent Mode v2)

| App `ConsentState` field | Google consent key(s) |
| --- | --- |
| `analytics` | `analytics_storage` |
| `marketing` | `ad_storage`, `ad_user_data`, `ad_personalization` |

`true` → `'granted'`, `false` → `'denied'`. `readConsent() === null` → all denied (default).

## Events (pushed to `dataLayer` from React)

| Event | Trigger | Parameters |
| --- | --- | --- |
| `generate_lead` | `HeroForm` submit ok | `form_location: 'hero_home'`, `service` |
| `generate_lead` | `ContactForm` submit ok | `form_location: 'contact_long'` |
| `phone_call` | Click on any `a[href^="tel:"]` | `link_location`, `link_url` |
| `email_click` | Click on any `a[href^="mailto:"]` | `link_location`, `link_url` |
| `whatsapp_click` | Click on any `a[href*="wa.me"]` or `a[href*="whatsapp"]` | `link_location`, `link_url` |

`page_view` is fired by GTM, not by React.

## GTM container setup (done by Yael in GTM UI — not code)

1. Open container `GTM-KTJFRZKP`.
2. Variables → Built-In Variables: enable **Page Path, Page URL, Click URL, History Source, New History Fragment**.
3. Create a **Google Tag** (or **GA4 Configuration**) tag:
   - Measurement ID: `G-Q4Q24B5K6Y`.
   - Trigger: **All Pages**.
   - Configuration settings → "Send a page view event when this configuration loads" → **leave on** for the initial page load. Subsequent client-side pageviews come from the History Change trigger below.
   - Consent Settings → "Require additional consent" → `analytics_storage`.
4. Trigger: **History Change** (built-in trigger type) → fires on any history change.
5. GA4 Event tag `page_view (SPA)`:
   - Event name: `page_view`.
   - Param `page_path`: `{{New History Fragment}}` or the relevant Page Path variable.
   - Trigger: the History Change trigger from step 4.
   - Consent Settings: require `analytics_storage`.
6. For each Custom Event (`generate_lead`, `phone_call`, `email_click`, `whatsapp_click`):
   - Trigger: **Custom Event** with event name matching exactly.
   - GA4 Event tag, same event name, parameters mapped from Data Layer Variables (`form_location`, `service`, `link_location`, `link_url`).
   - Consent Settings: require `analytics_storage`.
7. In GA4 admin, mark `generate_lead` as a key event/conversion.
8. Publish the container.

## Environment

- `NEXT_PUBLIC_GTM_ID=GTM-KTJFRZKP` in Vercel for **Production**.
- Optional in Preview; recommended off to keep GA data clean.
- Local dev: leave unset → all GTM code is no-op.

## Testing

### Automated (vitest)

- `src/lib/gtm.test.ts` — covers:
  - `isEnabled()` returns `false` when `NEXT_PUBLIC_GTM_ID` is unset.
  - `track()` is a no-op when disabled (does not throw, does not push).
  - `track()` pushes `{ event: name, ...params }` to `dataLayer` when enabled.
  - `setConsent(null)` → pushes `consent update` with all categories denied.
  - `setConsent({ analytics: true, marketing: false, ... })` → analytics granted, ad_* denied.
  - `setConsent({ analytics: true, marketing: true, ... })` → all granted.

### Manual verification (post-deploy)

1. Open production with cookies cleared. Open GTM **Preview / Tag Assistant** connected to the deploy URL.
2. Confirm `gtm.js` loads. Verify `consent default` pushed in `dataLayer` BEFORE any GA4 tag.
3. Before consent: GA4 tags should NOT fire (Tag Assistant shows them in "Not fired due to consent").
4. Accept all in banner → consent update pushed → GA4 Configuration tag fires → page_view sent.
5. Navigate (client-side) → History Change trigger fires → page_view tag fires.
6. Submit HeroForm → `generate_lead` Custom Event → GA4 tag fires with `form_location: hero_home`.
7. Submit ContactForm on `/contacto` and on home bottom → `generate_lead` with `form_location: contact_long`.
8. Click phone, mail, WhatsApp bubble, WhatsApp header link → corresponding tags fire with `link_location`.
9. Reject all → consent update denied → subsequent navigation does not fire GA4 tags.
10. Realtime in GA4 confirms events arriving.

## YAGNI / explicitly out of scope

- No additional pixels (Meta, LinkedIn, etc.) in this iteration. GTM is in place so they can be added later via the GTM UI without code changes.
- No scroll / video / file download tracking — GA4 Enhanced Measurement covers these at property level.
- No server-side GTM.
- No A/B testing.
- No cookie banner changes.

## Open risks

- **Inline `beforeInteractive` script position** — Next.js places `beforeInteractive` scripts in `<head>`. The consent default MUST execute before the GTM init script. Both are inline; ordering is by `id`/order of `<Script>` elements. Verify in production HTML that `gtm-consent-default` appears in `<head>` before `gtm-init`.
- **GTM `<noscript>` placement** — Google specifies "right after `<body>` open". In Next.js App Router this means rendering the iframe as the first child of `<body>` in `layout.tsx`. Easy but easy to forget.
- **z-index of WhatsApp bubble vs cookie banner** — banner `z-50`, bubble `z-40`. On first visit the bubble is partially hidden behind the banner. Acceptable.
- **History Change trigger and Next.js 16 App Router** — relies on standard `history.pushState` behavior. Verify during implementation; Next.js App Router uses standard `history.pushState`, so this should work, but smoke-test in Tag Assistant.
- **Duplicate page_view on initial load** — if both the GA4 Configuration tag (with auto page_view on load) and a History Change tag fire on the first navigation, we could double-count. Configure carefully: either leave auto page_view on Configuration tag and DO NOT include the very first load in the History Change tag, or turn auto page_view off and rely solely on a "page_view on All Pages + History Change" pattern. Decision to be confirmed during GTM container setup based on Tag Assistant behavior; the code is unaffected.
