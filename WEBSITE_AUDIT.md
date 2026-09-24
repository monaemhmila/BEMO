# Website Audit Report

**Project:** Mon Petit Hero (mon petit hero legacy branding)
**Site:** https://monpetithero.shop
**Repo:** `C:\Users\monem\Music\BEMO\BEMO` (TurboRepo monorepo: `apps/web`, `apps/backend`, packages)
**Date:** 2026-09-22
**Scope:** Read-only audit — no code was changed. Only this document was produced.

---

## 1. Executive Summary

The site is a Next.js 15 + React 19 frontend (`apps/web`) backed by an Express 5 API (`apps/backend`) that orchestrates ai-powered children's story generation: illustration generation (fal.ai / Flux), audio (ElevenLabs), PDF rendering (pdfkit), and storybook delivery (R2 / Cloudflare). There is no test suite, no CI, and no instrumentation that actually wires up.

The most important findings, in order of severity:

1. **CRITICAL — fal.ai webhooks are unauthenticated and spoofable**, which can both corrupt story state and be abused as an **SSRF** primitive.
2. **CRITICAL — SSRF** via `saveRemoteImageLocally(remoteUrl)` with no allowlist, timeout, or size limit.
3. **HIGH — brand/metadata inconsistency**: the entire site still identifies itself as "mon petit hero" in reply—erroneous SEO, metadata, and README.

Lower-severity issues are grouped below by category (Security, Bugs, Performance, SEO, Architecture, Repository hygiene).

---

## 2. Critical Security Issues

### 2.1 Unauthenticated fal.ai webhooks (spoofable + SSRF vector)

- `apps/backend/src/routes/fal-ai-webhook.routes.ts:15-44` and `apps/backend/src/routes/webhook.routes.ts:106-210` accept webhook requests with **no signature verification**.
- `fal-ai-webhook.routes.ts` reads `completion_id`, `status`, and `payload.images[].url` from the request body and marks stories as `Generated`/`Failed`, then **servers fetch `image.url`** via `saveRemoteImageLocally`.
- Because there is no authentication, anybody who can reach the endpoint can:
  - Flip a story's status to `Failed` (denial of service).
  - Force the backend to download an arbitrary URL the attacker controls (**SSRF**).
  - Inject arbitrary image data into a user's story.

**Recommended fix:** verify the `x-fal-signature` (fal.ai signed webhooks) with the connection secret; require `prisma.story.webhookSecret` match; whitelist fal.ai CIDR ranges as a defense-in-depth layer.

### 2.2 SSRF via `saveRemoteImageLocally`

- `apps/backend/src/lib/storage.ts:34` calls `fetch(remoteUrl)` without:
  - a URL/domain allowlist (only used for fal/Clerk/CDN origins today),
  - a request timeout or max response size,
  - validation or a redirect cap (`fetch` follows redirects by default).
- Callers in the webhook path pass attacker-controlled or webhook-derived URLs.

**Recommended fix:** domain allowlist, timeout + size limits, reject private IP ranges, cap redirects.

### 2.3 Error messages leaked to clients

- `apps/backend/src/middleware/error-handler.ts` returns raw `err?.message` in the JSON response. Internal details (DB, AI providers, stack fragments) can leak to users/bots.

### 2.4 Secrets hygiene (current state is OK, keep it that way)

- `.env` (gitignored, confirmed via `git check-ignore`) contains **real production secrets**: `CLERK_SECRET_KEY`, `AUDIO_GENERATION_PROVIDER`, `FAL_KEY`, `ELEVENLABS_API_KEY`, `OPENAI_API_KEY`, `CLERK_JWT_PUBLIC_KEY`, etc.
- `.env` is properly excluded, but secrets should still be rotated and centralized (env vars in the hosting platform / secret manager).
- The zod schema at `apps/backend/src/config/env.ts` is **missing** keys actually used elsewhere: `ADMIN_EMAIL`, `SIGNING_SECRET`, `ELEVENLABS_API_KEY`, and `AI_API_KEY` (which is an alias of `OPENAI_API_KEY`). Schemas drift from reality — a config typo would go unnoticed at boot.

---

## 3. Bugs / Correctness

### 3.1 Spoofable story-completion state
Covered in 2.1 — direct consequence: story statuses can be trivially forged.

### 3.2 Hardcoded backend URL
- `apps/backend/src/lib/storage.ts` returns `http://localhost:8080/...` for generated files. On the deployed server this returns the wrong host to clients. Must derive from request/host config.

### 3.3 Blocking `REDIS.KEYS()` during cache invalidation
- `apps/backend/src/lib/cache.service.ts` uses `keys(pattern)` in `invalidate()`. `KEYS` is O(N) over the whole keyspace and blocks Redis on production traffic.

### 3.4 Sentry is a no-op
- `apps/backend/src/lib/sentry.ts` request/error handlers literally call `next()` — no tracing or error capture happens despite `@sentry/node` being declared at the root.

### 3.5 Sync filesystem writes in async path
- `apps/backend/src/lib/storage.ts` uses `fs.writeFileSync` (and sync `mkdirSync`) inside promise/async handlers, blocking the event loop during PDF/image writes.

### 3.6 Silent port fallback
- `apps/backend/src/server.ts` waits 1s and re-tries the next port when `EADDRINUSE` — two processes can silently end up on different ports and the client can't reach them.

### 3.7 No back-pressure during generation
- Heavy synchronous work (AI image gen, ElevenLabs audio, face detection via `@vladmandic/face-api` + `canvas` + `sharp`, pdfkit) runs inline inside request handlers (story, custom-story, simple-storybook). A handful of concurrent story generations will block the event loop and starve health checks/other traffic.

### 3.8 Rate limiting is per-instance
- `apps/backend/src/middleware/rateLimiter.ts` uses the default (in-memory) store even though `ioredis` is available. Limits are meaningless once more than one instance runs.

### 3.9 Frontend: competing i18n engines
- `components/language-provider.tsx` rewrites the DOM (MutationObserver over every text node, storage key `ww_lang`) **and** `lib/i18n-context.tsx`/`lib/i18n/*` (storage key `app-locale`). Both run; behavior and stored preference diverge, causing inconsistent translations between pages.

### 3.10 Frontend: 3s polling instead of push
- `features/storybook/components/BookFlipbook.tsx:239` and `StoryViewer.tsx:105` poll the API with `setInterval(..., 3000)` forever on mounted book readers. Wasteful, battery-draining, and stale.

### 3.11 `priority` prop on all images
- `features/storybook/components/Imagecard.tsx:31` passes `priority` to every `next/image`, defeating lazy loading and hurting LCP budgets.

### 3.12 Branding mismatch: "mon petit hero" vs "Mon Petit Hero"
- Root layout metadata title/description/siteName in `apps/web/app/layout.tsx` say "mon petit hero"; the product is "Mon Petit Hero". README.md describes "Storybook AI" (a previous project). Inconsistent titles across pages.

### 3.13 Frontend polish
- No `loading.tsx` suspense files for most routes (home, blog, books, dashboard, create-custom, etc.) → blank flash during client-side route transitions.
- 14+ raw `<img>` tags across ~10 files bypass `next/image` optimizations (see Performance).

---

## 4. Performance Optimizations

### 4.1 Images (TPO priority)
Swap all raw `<img>` to `next/image` with explicit width/height (CLS) and `priority` only on the LCP hero. Files with raw `<img>`:
- `features/storybook/components/BookFlipbook.tsx` (multiple)
- `features/storybook/components/StoryViewer.tsx`
- `features/storybook/components/StoryLibrary.tsx`
- `features/storybook/components/StoryGenerator.tsx`
- `features/storybook/components/CustomStoryGenerator.tsx`
- `app/admin/page.tsx` (many)
- `components/sections/before-after.tsx`
- `components/ui/testimonials-columns.tsx`
- `app/storybook/dashboard/page.tsx`

### 4.2 Move generation off the request path
Introduce a job queue for story/image/audio/PDF jobs (Bull/Redis is already declared in the root package). Webhooks then complete jobs asynchronously and the client polls/uses SSE once, instead of long synchronous HTTP work.

### 4.3 Reduce client components
16 page files carry `"use client"` where the page could be a server component (e.g., `app/contact/page.tsx`, `app/faqs/page.tsx`, `app/login/page.tsx`, `app/sign-up/page.tsx`). Move interactive islands to smaller child components.

### 4.4 Split the admin monolith
`app/admin/page.tsx` is ~100 KB of client code in a single component. Lazy-load sections per tab and shard the file.

### 4.5 Fix polling
Replace 3s `setInterval` in `BookFlipbook.tsx`/`StoryViewer.tsx` with webhook/SSE updates or an explicit "refresh" action after job completion.

### 4.6 Kill the MutationObserver translation engine
Replace `components/language-provider.tsx` DOM rewriting with server-side dictionaries (from `lib/i18n/*`) + a lightweight locale context. This both fixes the i18n bug (3.9) and removes a hidden cost on every text render.

### 4.7 Cull dead assets and dependencies
- Dead fonts: `apps/web/app/fonts/GeistVF.woff` + `GeistMonoVF.woff` are unused (layout uses next/font Fredoka + Nunito).
- Unused frontend deps: `jspdf`, `jszip`, `sonner` (0 imports).
- Root vs backend dep mismatch: `bull`, `redis`, `@sentry/node` declared at root but not in `apps/backend` — either wire them up or remove.

### 4.8 Image serving/CDN
Assets are served from Cloudflare R2 (`CLOUDFLARE_URL`, `pub-b2acac8ef6a84c39b35165219b664570.r2.dev`); ensure long-lived cache headers + a CDN edge in front of `/api` static routes.

### 4.9 Caching & static rendering
- Grant ISR/staleTimes on template pages (`app/storybook/templates/*`) — they are read-heavy, rarely-changing content.
- `next.config.js` already has `optimizePackageImports` and `staleTimes`; extend to a custom `images.remotePatterns` for R2.

---

## 5. SEO

- **Branding consistency:** metadata title/description must say "Mon Petit Hero" everywhere; remove "mon petit hero".
- **Missing `metadataBase`** in root layout — required for correct OG/canonical URLs.
- **No `favicon`/`icon`/`og-image`** files in `apps/web/public` (only starter SVGs: next.svg, vercel.svg, turborepo.svg).
- **No `twitter` card metadata** in root layout (blog pages do it).
- **No `hreflang`** despite supporting `ar/fr/en` — add `alternates.languages`.
- **Incomplete `app/sitemap.ts`:** includes static routes, templates, blog — but misses `/books`, `/stickers`, `/welcome`, `/stats`.
- `robots.ts` exists as code (fine), but there is no `robots.txt` in `public` (expected, since robots.ts supersedes it).
- Verify every route declares a unique `<title>` + description; otherwise fall back to mon petit hero templates.

---

## 6. Architecture / Reliability

- **No tests, no CI, no Dockerfile, no deploy configs.** Introduce at least: unit tests for `storage.ts`, `cache.service.ts`, webhook signature validation, and the auth flow; a CI pipeline (lint → typecheck → test → build).
- **Process supervision:** `server.ts` should crash on fatal errors instead of silently binding a new port; add `/healthz` (excludes AI/DB heavy checks) wired to the load balancer probes.
- **Tracing/observability:** wire Sentry or OpenTelemetry for real (currently a no-op), including PRISMA/HTTP spans and error sampling.
- **Rate limiters:** back the Express rate limiter + slow-down with the Redis store that's already installed so limits survive restarts and multiple instances.
- **Secrets:** finish the zod env schema (missing `ADMIN_EMAIL`, `SIGNING_SECRET`, `ELEVENLABS_API_KEY`, `AI_API_KEY`); prefer env-injected config at boot over discovery.
- **Content delivery:** consider serving generated PDFs from R2/CDN URLs instead of `http://localhost:8080` paths.

---

## 7. Repository Hygiene

- **Tracked generated blobs** in git: `apps/backend/assets/pdfs/*.pdf` (up to ~11.7 MB each) and `apps/backend/assets/models/*.zip` (~146 KB each), plus `apps/backend/models/tiny_face_detector_model.bin`. Add to `.gitignore` and purge history with `git filter-repo` if history size matters.
- **No formatting/linting guardrails** (no `.prettierrc`, no husky lint-staged).
- **README stale** — describes "Storybook AI"; refresh to reflect Mon Petit Hero + monorepo structure.
- Duplicate header/navigation components exist (`Appbar` + `SiteHeader`); consolidate.

---

## 8. Ideas for New Optimizations / Growth

1. **Prefetch & parallel download** of the next page of the flipbook while the reader is on the current one.
2. **SSE/WebSocket job-progress** channel so the "generating story" spinner becomes live progress (image done → audio done → PDF done).
3. **Per-story caching + Idempotent order/story replay** on the backend to survive retries of the same request.
4. **A/B-ready metadata** (per-locale title/description + og images in en/fr/ar) to boost localized SEO.
5. **Edge caching** of `/api/storybook/templates` and any read-heavy GET endpoints at Cloudflare.
6. **Smart image pipeline**: never upscale; generate at target resolution once; use `AVIF/WebP` negotiation via `next/image` remotes.
7. **Uptime/payment automation:** alert on webhook failures (fal/ElevenLabs), add a fallback "story generation interrupted" retry.

---

## 9. Top 5 Actions to Prioritize

1. Add signature verification to the fal.ai webhooks (close the spoofing + SSRF vector).
2. Harden `storage.ts` remote fetch: allowlist, timeout, size caps, no redirect following.
3. Remove "mon petit hero" branding from metadata + README; add `metadataBase`, favicon, og-image, hreflang; complete sitemap.
4. Move generation jobs off the request thread (Bull/Redis) and back rate limits with Redis.
5. Swap raw `<img>` to `next/image` and remove 3s polling + dead fonts/deps.