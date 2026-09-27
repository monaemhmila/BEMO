# StoryBook AI — Template System & Client Experience Guide

This document provides a comprehensive overview of where story templates are stored in the codebase, how the template system is architected, and the step-by-step end-to-end client journey from login to PDF storybook generation.

---

## 📁 1. Where Story Templates Are Stored

The template system is modularly distributed across database schemas, backend APIs, prompt utility services, and frontend UI components:

| Component Layer | File Location | Description & Role |
| :--- | :--- | :--- |
| **Backend API Service** | [`apps/backend/src/routes/storybook.routes.ts`](file:///c:/Users/monem/OneDrive/Desktop/BEMO/StoryBook-AI/apps/backend/src/routes/storybook.routes.ts#L65-L145) | Exposes `GET /storybook/templates` returning pre-configured story templates (id, name, description, ageRange, category, theme). |
| **Frontend Generator Registry** | [`apps/web/features/generator/components/StoryGenerator.tsx`](file:///c:/Users/monem/OneDrive/Desktop/BEMO/StoryBook-AI/apps/web/features/generator/components/StoryGenerator.tsx#L42-L51) | Client-side map matching backend template IDs to auto-populate theme and category in the story generator wizard. |
| **Prompt Engineering & Quick Starters** | [`apps/web/utils/prompts/storyPrompts.ts`](file:///c:/Users/monem/OneDrive/Desktop/BEMO/StoryBook-AI/apps/web/utils/prompts/storyPrompts.ts#L126-L183) | Stores `STORY_STARTERS` list (theme, category, icon), `AGE_GUIDANCE` rules (3-5, 6-8, 9-12 years), and prompt builders for LLM story script generation. |
| **Database Model (Prisma)** | `packages/db/prisma/schema.prisma` | Defines the `StoryTemplate` database schema for persistent custom/admin templates and relates them to `Story.templateId`. **(Seeded with 1 template)** |
| **Storefront Catalogue (frontend)** | `apps/web/data/story-templates.ts` | The `STORY_TEMPLATES` array behind `/books`, `/books/[slug]` and `/stories/templates/[slug]`. Must stay slug-aligned with the seed below. |
| **Template Seed (database)** | `packages/db/prisma/seed-templates.ts` | `STOREFRONT_TEMPLATES` — the canonical `prompts` document (theme, moral lesson, educational focus, world context, 14 beats) upserted into `StoryTemplate`. Also invoked by `prisma/seed.ts`. |
| **Template Gallery UI Page** | [`apps/web/app/storybook/templates/page.tsx`](file:///c:/Users/monem/OneDrive/Desktop/BEMO/StoryBook-AI/apps/web/app/storybook/templates/page.tsx) | Next.js page that fetches and displays template cards with age filters, category tags, and "Use template" quick links. |

---

## ⚙️ 2. How the Template System Works

The Template System links pre-defined story concepts with dynamic AI prompt generation:

```
┌───────────────────────────┐      ┌───────────────────────────┐      ┌───────────────────────────┐
│   Template Gallery UI     │ ───► │  Story Generator Wizard   │ ───► │   LLM Script Generator    │
│  /storybook/templates     │      │   /storybook/create       │      │  buildMainStoryPrompt()   │
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
- The client clicks on **Templates** from the navigation bar ([`StorybookNav.tsx`](file:///c:/Users/monem/OneDrive/Desktop/BEMO/StoryBook-AI/apps/web/features/storybook/components/StorybookNav.tsx)).
- The gallery loads templates categorized by age range (3–5, 6–8, 9–12) and category.
- Clicking **"Use template"** redirects to the creation wizard (`/storybook/create?templateId=<template-id>`).

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

A template is defined in **two** places, and the `slug` / `id` must match in both
or the storefront will link to a template the database cannot generate from.

1. Add the catalogue entry (marketing copy, cover image, theme, art style) to
   `STORY_TEMPLATES` in `apps/web/data/story-templates.ts`:
   ```ts
   {
     slug: "dinosaur-expedition",
     title: "Dinosaur Expedition",
     audience: "any",
     category: "adventure",
     categoryLabel: "Adventure",
     emoji: "🦕",
     tagline: "Journeying back in time to meet some gentle giants.",
     description: "...",
     excerpt: "...",
     coverImage: "https://...",
     ageRange: "6-8",
     theme: "travels back in time and befriends a gentle dinosaur",
     artStyle: "vibrant prehistoric storybook illustration",
     moral: "Curiosity about the past makes you a better scientist.",
     learning: "Dinosaur eras and fossils.",
   }
   ```

2. Add the matching row to `STOREFRONT_TEMPLATES` in
   `packages/db/prisma/seed-templates.ts`, using the same id and theme plus the
   full `prompts` document. The `beats` array **must be exactly
   `BEAT_COUNT` (14) entries long** — `seedStoryTemplates` throws on any other
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
     prompts: { theme, moralLesson, educationalFocus, worldContext, beats: [/* 14 */] },
   }
   ```

3. (Optional) Add a starter prompt entry to `STORY_STARTERS` in
   `apps/web/utils/prompts/storyPrompts.ts`.

4. Run `npm run seed:templates` to upsert it into the database.

### Removing a template
Delete it from both registries, then add a migration that detaches any
`Story.templateId` referencing it (`Story.templateId` is a foreign key with no
`ON DELETE` action, so the rows must be nulled first) and deletes the row from
`"StoryTemplate"`. See
`packages/db/prisma/migrations/20260927000000_keep_only_birthday_template`.
