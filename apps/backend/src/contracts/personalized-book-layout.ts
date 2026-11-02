/** Printed personalized-book layout: 15 story pages plus one closing cover. */
export const PERSONALIZED_PRINT_PAGE_COUNT = 16;
export const PERSONALIZED_GENERATED_PRINT_PAGE_COUNT = 15;
export const PERSONALIZED_IMAGE_GENERATION_COUNT = 15;
export const PERSONALIZED_CHILD_IMAGE_COUNT = 15;
export const PERSONALIZED_SCENE_IMAGE_COUNT = 0;

export type PersonalizedPageKind = "child" | "scene-left" | "scene-right" | "final-cover";

export interface PersonalizedPageSlot {
  kind: PersonalizedPageKind;
  pageNumbers: number[];
  generationNumber?: number;
}

/**
 * Page 1 is the child-focused square front cover. Pages 2-15 are landscape
 * 16:9 child illustrations, each printed as two square leaves. Page 16 is the
 * existing reusable closing cover.
 */
export function getPersonalizedPageSlot(pageNumber: number): PersonalizedPageSlot {
  if (pageNumber === PERSONALIZED_PRINT_PAGE_COUNT) {
    return { kind: "final-cover", pageNumbers: [pageNumber] };
  }
  if (pageNumber === 1) {
    return { kind: "child", pageNumbers: [pageNumber], generationNumber: 1 };
  }

  return { kind: "child", pageNumbers: [pageNumber], generationNumber: pageNumber };
}

export function getPersonalizedGenerationSlots(): PersonalizedPageSlot[] {
  const slots: PersonalizedPageSlot[] = [];
  for (let pageNumber = 1; pageNumber <= PERSONALIZED_PRINT_PAGE_COUNT; pageNumber++) {
    const slot = getPersonalizedPageSlot(pageNumber);
    if (slot.kind === "final-cover") continue;
    if (!slots.some((existing) => existing.generationNumber === slot.generationNumber)) {
      slots.push(slot);
    }
  }
  // Generation order must follow the physical book order. Sorting by the
  // generation number would create all child images first and all landscape
  // spreads afterward, even though the saved page map is interleaved.
  return slots.sort((a, b) => a.pageNumbers[0] - b.pageNumbers[0]);
}
