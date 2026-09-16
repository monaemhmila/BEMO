# 📖 Complete Guide: Story Generation, Image Pipeline & PDF Design Architecture

This document explains in detail **what happens when a client generates a story**, **what controls the PDF book design**, **what happens to images throughout their lifecycle**, **where you can change everything in the codebase**, and **the most important code snippets explained**.

---

## 📑 Table of Contents
1. [End-to-End Workflow: What Happens When a Client Generates a Story](#1-end-to-end-workflow-what-happens-when-a-client-generates-a-story)
2. [What Controls the PDF Book Design?](#2-what-controls-the-pdf-book-design)
3. [What Happens to the Images? (Image Lifecycle)](#3-what-happens-to-the-images-image-lifecycle)
4. [Code Map: Where to Change Everything](#4-code-map-where-to-change-everything)
5. [Deep Dive: Important Parts of the Code Explained](#5-deep-dive-important-parts-of-the-code-explained)

---

## 1. End-to-End Workflow: What Happens When a Client Generates a Story

When a client triggers a story generation, the application processes the request through **5 major phases**:

```
[1. Client Request] ➡️ [2. LLM Story Script Generation] ➡️ [3. DB Creation & Prompting]
                                                                    │
[5. PDF Book Compilation] ⬅️ [4. Webhook / Storage Download] ⬅️ [Image Generation (fal.ai)]
```

### Phase 1: API Endpoint Invocation
- **Entry Points**: 
  - Trained Hero Model Storybook: `POST /api/storybook/generate` in [`storybook.routes.ts`](file:///c:/Users/monem/OneDrive/Desktop/BEMO/StoryBook-AI/apps/backend/src/routes/storybook.routes.ts#L152-L336)
  - No-Training On-the-Fly PDF Storybook: `POST /api/storybook/generate-pdf` in [`storybook.routes.ts`](file:///c:/Users/monem/OneDrive/Desktop/BEMO/StoryBook-AI/apps/backend/src/routes/storybook.routes.ts#L657-L732)
  - Simplified Stream PDF: `POST /api/simple-storybook/simple` in [`simple-storybook.routes.ts`](file:///c:/Users/monem/OneDrive/Desktop/BEMO/StoryBook-AI/apps/backend/src/routes/simple-storybook.routes.ts#L27-L85)
- **Input Parameters**: Child's name, age, story theme, story length (`short`: 5 pages, `medium`: 8 pages, `long`: 12 pages), category, dedication, art style, and optional voice ID.
- **Credit Check**: Validates user credits via [`CreditService`](file:///c:/Users/monem/OneDrive/Desktop/BEMO/StoryBook-AI/apps/backend/src/services/credit.service.ts) before initiating generation.

### Phase 2: LLM Story Script Generation
- The request passes to `generatePersonalizedStoryScript()` in [`story.service.ts`](file:///c:/Users/monem/OneDrive/Desktop/BEMO/StoryBook-AI/apps/backend/src/services/story.service.ts#L104-L154).
- The prompt incorporates:
  - Age-appropriate guidelines (`AGE_GUIDANCE` in [`story.service.ts:L37-L56`](file:///c:/Users/monem/OneDrive/Desktop/BEMO/StoryBook-AI/apps/backend/src/services/story.service.ts#L37-L56)): word count per page, vocabulary level, and themes.
  - Facial and visual identity anchor (ensuring consistent hero appearance).
  - Page count & JSON format requirements.
- **LLM Provider**: Tried via **OpenAI `gpt-4o-mini`** (`invokeOpenAI`), with automatic fallback to **Fal.ai `fal-ai/any-llm`** (`invokeFal`).
- **Output**: JSON containing `title` and array of `pages` (each having `pageNumber`, `text`, `imageDescription`, and `emotion`).

### Phase 3: Database Registration & Image Generation Request
- `createStory()` in [`story.service.ts`](file:///c:/Users/monem/OneDrive/Desktop/BEMO/StoryBook-AI/apps/backend/src/services/story.service.ts#L159-L205) creates a `Story` record with status `"Generating"` and `StoryPage` records with status `"Pending"` in PostgreSQL via Prisma.
- It builds an **Identity Lock prompt** for each page via `buildImagePrompt()`:
  - Enforces facial consistency, skin tone, hairstyle, clothing palette, and art direction while prohibiting logos, text, extra limbs, or distorted features.
- Image generation is queued via **Fal.ai**:
  - Primary Image Model: [`xai/grok-imagine-image`](https://fal.ai/models/xai/grok-imagine-image) (and `xai/grok-imagine-image/edit` for reference portraits).

### Phase 4: Webhook & Storage Handling
- Fal.ai processes the image asynchronously and sends a webhook to `POST /api/webhook/story/page` in [`webhook.routes.ts`](file:///c:/Users/monem/OneDrive/Desktop/BEMO/StoryBook-AI/apps/backend/src/routes/webhook.routes.ts#L129-L233).
- **Fallback Polling**: If a webhook is missed or delayed, `checkPendingPages()` in [`story.service.ts:L463-L535`](file:///c:/Users/monem/OneDrive/Desktop/BEMO/StoryBook-AI/apps/backend/src/services/story.service.ts#L463-L535) queries Fal.ai queue status directly.
- Upon receiving the image URL, `saveRemoteImageLocally()` in [`lib/storage.ts`](file:///c:/Users/monem/OneDrive/Desktop/BEMO/StoryBook-AI/apps/backend/src/lib/storage.ts#L19-L49) downloads the image and saves it to local disk (`/assets/generated/`).
- Database status for the `StoryPage` is updated to `"Generated"`.
- `StoryCompletionService.checkStoryCompletion()` checks if all pages are ready, updating the story status to `"Completed"`.

### Phase 5: PDF Compilation
- When requested via `GET /api/storybook/:id/pdf` or `POST /api/storybook/generate-pdf`, [`PDFService.generateStorybookPdf()`](file:///c:/Users/monem/OneDrive/Desktop/BEMO/StoryBook-AI/apps/backend/src/services/pdf.service.ts#L42-L70) is called.
- Images are processed using `sharp` to normalize EXIF orientation and JPEG encoding.
- **PDFKit** draws the cover page and each story page in landscape layout.
- The binary buffer is streamed back to the client as an attachment (e.g. `My-Story.pdf`).

---

## 2. What Controls the PDF Book Design?

All PDF visual styling, layout, typography, colors, page sizing, and positioning are controlled in **[`apps/backend/src/services/pdf.service.ts`](file:///c:/Users/monem/OneDrive/Desktop/BEMO/StoryBook-AI/apps/backend/src/services/pdf.service.ts)**.

### PDF Styling Parameters & Constants
In [`pdf.service.ts`](file:///c:/Users/monem/OneDrive/Desktop/BEMO/StoryBook-AI/apps/backend/src/services/pdf.service.ts#L15-L18):
- `PAGE_BACKGROUND = "#FFF9F0"`: Creamy off-white page background.
- `INK = "#263238"`: Deep charcoal text color.
- `ACCENT = "#E6804D"`: Warm coral accent color.
- `MARGIN = 38`: Page edge margin in points (px).

### Page Geometry & Document Setup
In [`pdf.service.ts:L49-L60`](file:///c:/Users/monem/OneDrive/Desktop/BEMO/StoryBook-AI/apps/backend/src/services/pdf.service.ts#L49-L60):
- **Document Size**: `A4` in `landscape` orientation (841.89 x 595.28 pt).
- **Background Ornaments**: Decorative translucent circles (`paintBackground()`) drawn in the top-left (`#F6BE7A`) and bottom-right (`#91C9B1`).

### Cover Page Design (`drawCover`)
In [`pdf.service.ts:L72-L107`](file:///c:/Users/monem/OneDrive/Desktop/BEMO/StoryBook-AI/apps/backend/src/services/pdf.service.ts#L72-L107):
- **Full Cover Image**: Fits the full A4 canvas with a 26% dark overlay (`fillOpacity(0.26).fill("#1F2937")`) for contrast.
- **Title Panel**:
  - Position: Center horizontally, rounded rectangle (`roundedRect(panelX, panelY, panelWidth, 142, 18)`).
  - Background: Cream color (`#FFF9F0`) with 93% opacity and gold border (`#F3C48E`).
  - Title Font: `Helvetica-Bold`, size `30pt`, color `INK`.
  - Subtitle: `Helvetica`, size `12pt`, color `ACCENT`, tracking `1.3`.
- **Dedication Box**: Placed near the bottom, `Helvetica-Oblique`, size `13pt`.

### Inner Story Page Design (`drawStoryPage`)
In [`pdf.service.ts:L109-L141`](file:///c:/Users/monem/OneDrive/Desktop/BEMO/StoryBook-AI/apps/backend/src/services/pdf.service.ts#L109-L141):
- **Illustration Container**:
  - Width: `width - MARGIN * 2` (765.89 pt).
  - Height: `326 pt`.
  - Border radius: `14 pt` rounded clipping rectangle with border color `#E9CDAA`.
  - Fallback: Shows *"Illustration unavailable"* if image fails.
- **Story Text Block**:
  - Positioned `24 pt` below the image.
  - Font: `Helvetica`, size `16pt`, color `INK`, `lineGap: 6`, centered alignment, with automatic ellipsis truncation if text exceeds available height.
- **Footer**:
  - Horizontal rule (`#E9CDAA`, line width `0.7 pt`) at `height - 31`.
  - Page counter: `Helvetica`, size `9pt`, `#7B8794` displaying `${pageNumber} / ${totalPages}`.

---

## 3. What Happens to the Images? (Image Lifecycle)

Here is the exact journey of an image from prompt to PDF:

```
[1. Prompt Construction] ➡️ [2. Fal.ai Generation Request] ➡️ [3. Remote Image URL]
                                                                        │
[6. Sharp PDF Buffer Optimization] ⬅️ [5. PDF Service Fetch] ⬅️ [4. Local Storage Download]
```

1. **Prompt Engineering**:
   - `buildImagePrompt()` in [`story.service.ts`](file:///c:/Users/monem/OneDrive/Desktop/BEMO/StoryBook-AI/apps/backend/src/services/story.service.ts#L210-L225) combines the scene description, identity lock (face, skin tone, hair), art style (e.g. Disney Pixar / comic style), camera composition, and negative rules (no text/watermarks).
2. **AI Model Rendering**:
   - Fal.ai runs [`xai/grok-imagine-image`](https://fal.ai/models/xai/grok-imagine-image) (or `xai/grok-imagine-image/edit` for child reference portraits).
   - Generates a 1:1 square high-resolution image URL hosted on `fal.media`.
3. **Webhook & Local Caching**:
   - When Fal finishes, the backend receives the webhook payload containing `images[0].url`.
   - `saveRemoteImageLocally()` in [`lib/storage.ts`](file:///c:/Users/monem/OneDrive/Desktop/BEMO/StoryBook-AI/apps/backend/src/lib/storage.ts#L19-L49) downloads the image via `fetch()`, converts it to a Node `Buffer`, saves it in `apps/backend/assets/generated/`, and updates the database with a local URL (or keeps the remote URL).
4. **Sharp Pre-Processing for PDF**:
   - Before PDFKit embeds the image, `fetchImageBuffer()` in [`pdf.service.ts`](file:///c:/Users/monem/OneDrive/Desktop/BEMO/StoryBook-AI/apps/backend/src/services/pdf.service.ts#L20-L39) processes the image with `sharp(rawBuffer)`:
     - Automatically handles EXIF rotation `.rotate()`.
     - Normalizes format to JPEG with 92% quality and `mozjpeg` compression.
5. **PDF Embedding & Clipping**:
   - PDFKit creates a rounded clipping mask (`roundedRect(..., 14).clip()`) and draws the image buffer with `{ fit: [imageWidth, imageHeight], align: "center", valign: "center" }`.

---

## 4. Code Map: Where to Change Everything

Below is the complete file directory guide showing where to modify specific aspects of the app:

| What You Want to Change | File Location | Key Lines / Functions |
| :--- | :--- | :--- |
| **PDF Colors, Fonts, Margins & Layout** | [`apps/backend/src/services/pdf.service.ts`](file:///c:/Users/monem/OneDrive/Desktop/BEMO/StoryBook-AI/apps/backend/src/services/pdf.service.ts) | `PAGE_BACKGROUND`, `INK`, `ACCENT`, `drawCover()`, `drawStoryPage()` |
| **LLM Story Script Prompt & Rules** | [`apps/backend/src/services/story.service.ts`](file:///c:/Users/monem/OneDrive/Desktop/BEMO/StoryBook-AI/apps/backend/src/services/story.service.ts#L104-L154) | `generatePersonalizedStoryScript()`, `AGE_GUIDANCE` |
| **OpenAI vs Fal LLM Provider Choice** | [`apps/backend/src/services/story.service.ts`](file:///c:/Users/monem/OneDrive/Desktop/BEMO/StoryBook-AI/apps/backend/src/services/story.service.ts#L341-L432) | `invokeFal()`, `invokeOpenAI()` |
| **AI Image Prompt Anchor & Quality Rules** | [`apps/backend/src/services/story.service.ts`](file:///c:/Users/monem/OneDrive/Desktop/BEMO/StoryBook-AI/apps/backend/src/services/story.service.ts#L210-L225) | `buildImagePrompt()` |
| **Fal.ai Image Generator (FLUX 2 Turbo)** | [`apps/backend/src/services/image-generation.service.ts`](file:///c:/Users/monem/OneDrive/Desktop/BEMO/StoryBook-AI/apps/backend/src/services/image-generation.service.ts) | `generateStorybookImage()`, `generateImageSync()` |
| **Face Consistency & Model Training** | [`apps/backend/src/services/face-consistency.service.ts`](file:///c:/Users/monem/OneDrive/Desktop/BEMO/StoryBook-AI/apps/backend/src/services/face-consistency.service.ts) | `trainModel()`, `generateFaceConsistentImage()` |
| **Image Download & Asset Path Storage** | [`apps/backend/src/lib/storage.ts`](file:///c:/Users/monem/OneDrive/Desktop/BEMO/StoryBook-AI/apps/backend/src/lib/storage.ts) | `saveRemoteImageLocally()`, `getAssetsPath()` |
| **Webhooks (Fal.ai & Story Completion)** | [`apps/backend/src/routes/webhook.routes.ts`](file:///c:/Users/monem/OneDrive/Desktop/BEMO/StoryBook-AI/apps/backend/src/routes/webhook.routes.ts#L129-L233) | `POST /story/page` webhook handler |
| **Story Routes & PDF Download API** | [`apps/backend/src/routes/storybook.routes.ts`](file:///c:/Users/monem/OneDrive/Desktop/BEMO/StoryBook-AI/apps/backend/src/routes/storybook.routes.ts) | `POST /generate`, `GET /:id/pdf`, `POST /generate-pdf` |
| **Credit Calculation & Costs** | [`apps/backend/src/services/credit.service.ts`](file:///c:/Users/monem/OneDrive/Desktop/BEMO/StoryBook-AI/apps/backend/src/services/credit.service.ts) | `calculateStorybookCost()`, `deductCredits()` |

---

## 5. Deep Dive: Important Parts of the Code Explained

### A. PDF Rendering Engine (`PDFService`)
*Location: [`apps/backend/src/services/pdf.service.ts`](file:///c:/Users/monem/OneDrive/Desktop/BEMO/StoryBook-AI/apps/backend/src/services/pdf.service.ts)*

```typescript
// Fetches image and converts it via Sharp for optimal PDFKit rendering
async function fetchImageBuffer(url: string): Promise<Buffer | null> {
  const response = await fetch(url);
  const rawBuffer = Buffer.from(await response.arrayBuffer());
  return await sharp(rawBuffer)
    .rotate() // Auto-correct orientation
    .jpeg({ quality: 92, mozjpeg: true })
    .toBuffer();
}

// Draw a single story page with rounded image container & centered typography
private drawStoryPage(doc: PDFKit.PDFDocument, page: StoryPagePayload, image: Buffer | null, totalPages: number) {
  doc.addPage();
  const { width, height } = doc.page;
  this.paintBackground(doc, width, height);

  const imageX = MARGIN;
  const imageY = 38;
  const imageWidth = width - MARGIN * 2;
  const imageHeight = 326;

  if (image) {
    doc.save();
    doc.roundedRect(imageX, imageY, imageWidth, imageHeight, 14).clip();
    doc.image(image, imageX, imageY, { fit: [imageWidth, imageHeight], align: "center", valign: "center" });
    doc.restore();
  }

  // Draw story page text
  const textY = imageY + imageHeight + 24;
  doc.font("Helvetica").fontSize(16).fillColor(INK).text(page.content.trim(), MARGIN + 18, textY, {
    width: width - (MARGIN + 18) * 2,
    align: "center",
    lineGap: 6,
    height: height - textY - 50,
    ellipsis: true,
  });
}
```

### B. Story Prompt Generation (`StoryService`)
*Location: [`apps/backend/src/services/story.service.ts:L116-L151`](file:///c:/Users/monem/OneDrive/Desktop/BEMO/StoryBook-AI/apps/backend/src/services/story.service.ts#L116-L151)*

```typescript
const prompt = `
  You are creating a personalized children's storybook for ${input.childAge}-year-old ${input.childName}.
  
  STORY PARAMETERS:
  - Story length: exactly ${pageCount} numbered pages (${guidance.textLength})
  - Theme: ${input.theme}
  - Main character: ${input.childName} (described visually as ${characterName})
  - ${identity}
  
  CRITICAL REQUIREMENTS:
  1. ${input.childName} MUST be the hero on EVERY page.
  2. Build one continuous story arc: introduction, problem, resolution, and warm ending.
  3. Return JSON containing title and exactly ${pageCount} pages.
`;
```

### C. Identity-Locked Image Prompt Construction
*Location: [`apps/backend/src/services/story.service.ts:L210-L225`](file:///c:/Users/monem/OneDrive/Desktop/BEMO/StoryBook-AI/apps/backend/src/services/story.service.ts#L210-L225)*

```typescript
private buildImagePrompt(page: StoryPageInput, artStyle: string, childName?: string): string {
  return `Premium children's storybook illustration.
Identity lock: ${childName || "the child hero"} is the same child in the supplied portrait/trained model on every page. Preserve their facial structure, skin tone, eye color, hairstyle, age-appropriate proportions...
Scene continuity: ${page.imageDescription}
Art direction: ${artStyle}; warm cinematic lighting, polished expressive illustration...
Never render words, letters, speech bubbles, watermarks, logos, extra fingers, distorted facial features...`;
}
```

---

## 💡 Summary of Quick Modifications

- **To change the font size or colors of the PDF**: Edit lines 15–18 and lines 87–97, 131–137 in [`pdf.service.ts`](file:///c:/Users/monem/OneDrive/Desktop/BEMO/StoryBook-AI/apps/backend/src/services/pdf.service.ts).
- **To change the page size or orientation of the PDF**: Edit line 50 in [`pdf.service.ts`](file:///c:/Users/monem/OneDrive/Desktop/BEMO/StoryBook-AI/apps/backend/src/services/pdf.service.ts#L50) (e.g. change `"A4"` to `"letter"` or `"landscape"` to `"portrait"`).
- **To change the story text tone or page counts**: Edit `AGE_GUIDANCE` and `getPageCount()` in [`story.service.ts`](file:///c:/Users/monem/OneDrive/Desktop/BEMO/StoryBook-AI/apps/backend/src/services/story.service.ts).
- **To change the image art style defaults**: Edit `buildStorybookPrompt()` in [`image-generation.service.ts`](file:///c:/Users/monem/OneDrive/Desktop/BEMO/StoryBook-AI/apps/backend/src/services/image-generation.service.ts#L261-L266).
