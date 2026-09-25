/**
 * Story reader data model. Mirrors the shape returned by
 * `GET {BACKEND_URL}/story/:id` (see StoryService.getStoryWithStatus) so the
 * reader can reuse the existing API without duplicating generation logic.
 */

export interface ReaderPage {
  id: string;
  pageNumber: number;
  content: string;
  imageUrl?: string | null;
  audioUrl?: string | null;
  status: string;
}

export interface ReaderStory {
  id: string;
  title: string;
  status: "Pending" | "Generating" | "Completed" | "Failed" | string;
  childName?: string | null;
  dedication?: string | null;
  model?: {
    name?: string;
    thumbnail?: string;
  } | null;
  pages: ReaderPage[];
}

/** Which physical side of the gutter a page sits on (within a spread). */
export type PageSide = "left" | "right" | "single";

/** Zero-based page index === react-pageflip's flip event `data` value. */
export type FlipPageIndex = number;