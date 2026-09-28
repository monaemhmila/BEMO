# Mon Petit Hero — Template System & Client Experience Guide

This document provides a comprehensive overview of where story templates are stored in the codebase, how the template system is architected, and the step-by-step end-to-end client journey from login to PDF storybook generation.

---

## 📁 1. Where Story Templates Are Stored

**The database is the only catalogue.** There is no hard-coded template list in
the frontend: a `StoryTemplate` row flows database → backend → storefront, so a
template added in the database appears on `/books` within a minute, with no
frontend change and no rebuild.

```
StoryTemplate row (Prisma / Postgres)
        │
        ▼
GET /storybook/templates          apps/backend/src/routes/storybook.routes.ts
        │  mapped by toStorefrontTemplate()
        ▼
StorefrontTemplate payload         apps/backend/src/contracts/storybook.ts
        │
        ▼
getStoreTemplates()                apps/web/lib/story-templates.ts   (server, ISR 60s)
        │
        ▼
/books, /books/[slug], /stories/templates/[slug], homepage shelves, sitemap
```

| Component Layer | File Location | Description & Role |
| :--- | :--- | :--- |
| **Database Model (Prisma)** | `packages/db/prisma/schema.prisma` | The `StoryTemplate` model: the generation `prompts` document (JSON) plus the storefront copy (`tagline`, `excerpt`, `emoji`, `audience`, `artStyle`, `review`) and `coverImage`. Related to `Story.templateId`. |
| **Backend API** | `apps/backend/src/routes/storybook.routes.ts` | `GET /storybook/templates` returns every active `PREDEFINED` template. `POST /storybook/templates/custom` returns the same shape for a user's own template. |
| **Payload Contract** | `apps/backend/src/contracts/storybook.ts` | `StorefrontTemplate` and `toStorefrontTemplate()`, which flattens `prompts.theme` / `prompts.moralLesson` / `prompts.educationalFocus` into the `theme` / `moral` / `learning` the shop pages render. |
| **Storefront Data Layer** | `apps/web/lib/story-templates.ts` | `getStoreTemplates()` / `getStoreTemplate()` fetch the payload and adapt it to the `StoryTemplate` UI shape. Cached 60s, and resolves to `[]` rather than throwing so a backend outage can't fail a build. |
| **UI Types & Design System** | `apps/web/data/story-templates.ts` | `StoryTemplate` (UI shape), `StorefrontTemplate` (API shape), `CATEGORY_META` (labels, chip colours, gradients) and the shelf helpers. **No template data lives here.** |
| **Template Seed** | `packages/db/prisma/seed-templates.ts` | `STOREFRONT_TEMPLATES` — the definitions upserted into `StoryTemplate`. Also invoked by `prisma/seed.ts`. |
| **Prompt Engineering** | `apps/web/utils/prompts/storyPrompts.ts` | `STORY_STARTERS`, `AGE_GUIDANCE` (3-5, 6-8, 9-12) and prompt builders for LLM script generation. |
| **Storefront Pages** | `apps/web/app/books/page.tsx`, `books/[slug]/page.tsx`, `stories/templates/[slug]/page.tsx` | Read the catalogue through `getStoreTemplates()`. |
| **Admin CRUD** | `apps/web/app/admin/page.tsx` (`TemplatesTab`, `TemplateEditor`) | Create / edit / duplicate / publish / delete templates at `/admin` → Templates. |

---

## ⚙️ 2. How the Template System Works

The Template System links pre-defined story concepts with dynamic AI prompt generation:

```
┌───────────────────────────┐      ┌───────────────────────────┐      ┌───────────────────────────┐
│   Storefront Catalogue    │ ───► │  Story Generator Wizard   │ ───► │   LLM Script Generator    │
│         /books           │      │   /storybook/create       │      │  buildMainStoryPrompt()   │
└───────────────────────────┘      └───────────────────────────┘      └───────────────────────────┘
                                                 │                                  │
                                                 ▼                                  ▼
                                   ┌───────────────────────────┐      ┌───────────────────────────┐
                                   │  Child Photo & Features   │ ───► │  Fal AI Image Generator   │
                                   │   (Identity Lock Prompt)  │      │  (Face-Consistent Render) │
                                   └───────────────────────────┘      └───────────────────────────┘
                                                                                    │
                                                                                    ▼
                                                                      ┌───────────────────────────┐
                                                                      │   PDF Export & Narration  │
                                                                      │   (Print-Ready Book)      │
                                                                      └───────────────────────────┘
```

### Pre-defined Templates with Moral & Educational Values
The catalogue currently ships a single predefined template, explicitly designed around a core moral lesson and age-appropriate educational learning targets:

1. **Birthday Adventure and the Greedy Goblin** (`birthday-adventure-and-the-greedy-goblin`):
   - **Age Range**: 4-8 · **Category**: sentimental
   - **Moral Value**: Taking what belongs to others leaves you alone; the best gift is the one you give away.
   - **Educational Focus**: Counting and comparing how many gifts there are, and how sharing makes everyone happier.

Templates created by users through `POST /storybook/templates/custom` are stored with `source = 'CUSTOM'` and are not part of this catalogue.

---

## 🎨 3. Client Journey & User Experience Flow

Here is the step-by-step walk-through of the client's experience:

### Step 1: Authentication & Access
- The client logs into the application using **Clerk Authentication**.
- Unauthenticated users attempting to access story generation are redirected to `/sign-in`.

### Step 2: Selecting a Template or Starter
- The client browses the catalogue at **`/books`**, which reads the active templates straight from the database.
- The listing is filterable by age range and category ([`template-book-filters.tsx`](file:///c:/Users/monem/OneDrive/Desktop/BEMO/StoryBook-AI/apps/web/components/template-book-filters.tsx)).
- Clicking **"Use template"** redirects to the creation wizard (`/storybook/create?templateId=<template-id>`), which resolves that template from the database on the server.

### Step 3: Generator Wizard — Step 0: "Your Hero" (Kid's Details)
- **Child's Name & Age**: Client enters the hero's name (e.g. "Emma") and age.
- **Photo Upload**: Client uploads a clear front-facing photo of the child (JPG, PNG, or WebP up to 3 MB).
- **Physical Characteristics (Identity Lock)**: Client selects:
  - Hair Color (Black, Dark Brown, Blonde, Red, etc.)
  - Eye Color (Brown, Blue, Hazel, Green, etc.)
  - Skin Tone (Light, Medium, Tan, Brown, Dark, etc.)
  - Hair Style / Distinct Features (e.g. "shoulder-length curly hair with fringe")

### Step 4: Generator Wizard — Step 1: Story Theme & Customization
- The selected template auto-fills the **Adventure Theme** and **Category**.
- The client can tweak the theme or write a custom story line.
- Selects **Story Length**:
  - `short`: 5 pages (~2.5 minutes total render time)
  - `medium`: 8 pages
  - `long`: 12 pages

### Step 5: Generator Wizard — Step 2: Art Style & Dedication
- Selects from visual art styles (e.g. *Comic Disney/Pixar*, *Watercolor*, *3D Render*, *Digital Storybook*).
- Optional **Book Dedication** (e.g., *"To Emma, the bravest explorer in the universe — Love, Mom & Dad"*).

### Step 6: Story & Image Generation Execution
- Clicking **"Generate Story"** sends a request to the backend service ([`storybook.routes.ts`](file:///c:/Users/monem/OneDrive/Desktop/BEMO/StoryBook-AI/apps/backend/src/routes/storybook.routes.ts)).
- **Script Generation**: An LLM builds an age-tailored JSON script based on `AGE_GUIDANCE` rules in [`storyPrompts.ts`](file:///c:/Users/monem/OneDrive/Desktop/BEMO/StoryBook-AI/apps/web/utils/prompts/storyPrompts.ts).
- **Image Generation**: Each page's scene description, combined with the child's photo and identity lock parameters, is passed to Fal AI (`FLUX 2 Turbo`). Page 1 automatically renders a 3D kid-friendly title display.

### Step 7: Completed Book & Export
- The client is presented with a success screen: **"Your Storybook is Ready! 🎉"**.
- The client can **Download PDF** (print-ready PDF generated via PDFKit in [`pdf.service.ts`](file:///c:/Users/monem/OneDrive/Desktop/BEMO/StoryBook-AI/apps/backend/src/services/pdf.service.ts)).
- (Optional) Client can generate realistic audio narration powered by ElevenLabs.

---

## 🛠️ 4. How to Add New Templates

A template is defined in **one** place: `STOREFRONT_TEMPLATES` in
`packages/db/prisma/seed-templates.ts`. There is no frontend list to keep in
sync — the storefront renders whatever the database returns.

1. Add the row, including the catalogue copy. The `beats` array **must be exactly
   `BEAT_COUNT` (15) entries long** — `seedStoryTemplates` throws on any other
   count, and `loadUsableTemplate` in `storybook.routes.ts` rejects templates
   that do not match, so the wizard would fail with a "no usable template" error.

   ```ts
   {
     id: "dinosaur-expedition",
     name: "Dinosaur Expedition",
     description: "...",
     ageRange: "6-8",
     category: "adventure",
     difficulty: 2,
     tags: ["dinosaurs", "courage", "science"],
     // storefront copy — all optional, the shop degrades gracefully
     tagline: "Journeying back in time to meet some gentle giants.",
     excerpt: "...",
     emoji: "🦕",
     audience: "any",
     artStyle: "vibrant prehistoric storybook illustration",
      coverImage: "https://...",
      previews: [
        { src: "/templates/dinosaurs/preview-1.jpg", type: "image", mimeType: "image/jpeg", caption: "Page 3" },
      ],
      review: { rating: 5, count: 120, quote: "...", author: "A. Reader" },
      prompts: { theme, moralLesson, educationalFocus, worldContext, beats: [/* 15 */] },
   }
   ```

2. (Optional) Add a starter prompt entry to `STORY_STARTERS` in
   `apps/web/utils/prompts/storyPrompts.ts`.

3. Run `npm run seed:templates` to upsert it, then `npm run migrate` if you
   changed the schema. The template is live on `/books` within 60 seconds.

### Notes on the shape
- `id` doubles as the storefront slug: `/books/<id>`. Keep it URL-safe.
- `theme`, `moral` and `learning` are **not** columns — they are read out of the
  `prompts` JSON (`theme`, `moralLesson`, `educationalFocus`).
- `category` is free text. A value with no entry in `CATEGORY_META` renders with
  the "Adventure" styling rather than breaking.
- `coverImage` is optional; a template without one shows its category gradient
  instead of a broken image.
- `previews` is an ordered array of gallery slides for the book detail page. When
  it is empty the page falls back to neutral "Preview N" placeholders, so a
  template is never left with a broken carousel. Predefined templates commit
  their art to `apps/web/public/templates/<id>/` and use root-relative
  `/templates/...` srcs, so a fresh clone renders the gallery with no upload
  step. Cap is 12 slides; the seed throws past that.
- Image URLs must be `http(s)://` or a root-relative path starting with a single
  `/`. Anything else (`javascript:`, `data:`, and protocol-relative `//host` so a
  stored value can never be pulled from an unexpected origin) is rejected on
  write and stripped on read, so a stored value can never execute in the
  storefront. The seed mirrors this rule in `SAFE_IMAGE_URL`, and so does the
  storefront mapper in `apps/web/lib/story-templates.ts`.

### Uploading cover and preview images

`/admin` → **Templates** → edit → **Upload cover** / **Upload previews** stores the
file and fills in the URL field for you. The URL field stays editable, so pasting
an existing URL (or a CDN link) still works.

- Endpoint: `POST /admin/templates/images/upload?folder=covers|previews&filename=<name>`
  (admin auth). The body is the **raw image**, not JSON, so a 4MB photo does not
  become 5.5MB of base64.
- Files are re-encoded to progressive JPEG (max 1600px, quality 82, EXIF
  rotation applied) and renamed to a random token, so a crafted filename cannot
  pick its own path. Limit is 10MB per file, 12 previews per template.
- Uploads land in `assets/<folder>/` relative to the backend's working
  directory (`apps/backend/assets/` when started from there) and are served at
  `/assets/previews/...` and `/assets/covers/...`. Both folders are gitignored.
- Uploading is **separate from saving**: the URL only reaches the database when
  you press Save, so abandoning the editor leaves the storefront unchanged (and
  leaves an unreferenced file behind — delete the template to sweep its files).
- `PUBLIC_ASSET_BASE_URL` overrides the `http://localhost:<PORT>` prefix. Set it
  in production or stored URLs will point at localhost.
- Deleting a template deletes its own uploaded cover and previews. It will not
  delete a file it did not create: external URLs and `/assets/pdfs/...` are left
  alone.

### Adding a template from the admin dashboard
`/admin` → **Templates** tab does the same thing without a deploy. It lists every
template (predefined and user-created) with its beat count, story usage and live/
hidden state, and can create, edit, duplicate, publish and delete.

Backed by `GET/POST /admin/templates`, `PUT /admin/templates/:id`,
`PATCH /admin/templates/:id/toggle` and `DELETE /admin/templates/:id`, all behind
`authMiddleware` + `adminAuthMiddleware`.

Two behaviours worth knowing:
- **The id is immutable once created**, because it is the shop URL (`/books/<id>`).
  Rename freely; the URL does not move.
- **Deleting a template that stories still use returns `409`** and reports the
  count, rather than silently cascading. Either deactivate it to pull it from the
  shop and the wizard while keeping every story, or delete anyway to detach those
  stories. Deactivated templates keep their `Story.templateId` links.
- A duplicated template is created **hidden** so it can be reviewed before going live.

The backend rejects any save whose `prompts.beats` is not exactly 14 entries,
because `loadUsableTemplate` in `storybook.routes.ts` refuses such templates and
the customer would see a confusing "no usable template" error. The tab shows a
`n / 14` badge and warns when any template is short.

### Removing a template
Delete it from `STOREFRONT_TEMPLATES`, then add a migration that detaches any
`Story.templateId` referencing it (`Story.templateId` is a foreign key with no
`ON DELETE` action, so the rows must be nulled first) and deletes the row from
`"StoryTemplate"`. See
`packages/db/prisma/migrations/20260927000000_keep_only_birthday_template`.
