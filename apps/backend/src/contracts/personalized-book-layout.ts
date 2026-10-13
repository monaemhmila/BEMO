/** Printed personalized-book layout: 30 pages, 21 AI generations. */
export const PERSONALIZED_PRINT_PAGE_COUNT = 30;
export const PERSONALIZED_GENERATED_PRINT_PAGE_COUNT = 29;
export const PERSONALIZED_IMAGE_GENERATION_COUNT = 21;
export const PERSONALIZED_CHILD_IMAGE_COUNT = 13;
export const PERSONALIZED_SCENE_IMAGE_COUNT = 8;

export type PersonalizedPageKind = "child" | "scene-left" | "scene-right" | "final-cover";

export interface PersonalizedPageSlot {
  kind: PersonalizedPageKind;
  pageNumbers: number[];
  generationNumber?: number;
}

/**
 * Page 1 is the child-focused front cover. The physical order is four pages
 * of child, child, scene-left, scene-right repeated six times, followed by
 * two final scene spreads. This gives 13 generated square child pages and
 * eight generated two-page scene spreads. Page 30 is the existing back cover.
 */
export function getPersonalizedPageSlot(pageNumber: number): PersonalizedPageSlot {
  if (pageNumber === PERSONALIZED_PRINT_PAGE_COUNT) {
    return { kind: "final-cover", pageNumbers: [pageNumber] };
  }
  if (pageNumber === 1) {
    return { kind: "child", pageNumbers: [pageNumber], generationNumber: 1 };
  }

  // Child pages from the requested physical layout:
  // 1 cover, then 12 inside child pages.
  const groupedChildPages = new Map<number, number>([
    [2, 2], [3, 3],
    [6, 4], [7, 5],
    [10, 6], [11, 7],
    [14, 8], [15, 9],
    [18, 10], [19, 11],
    [22, 12], [23, 13],
  ]);
  const childGeneration = groupedChildPages.get(pageNumber);
  if (childGeneration) {
    return { kind: "child", pageNumbers: [pageNumber], generationNumber: childGeneration };
  }

  // Every landscape generation owns two adjacent physical pages.
  const spreadStart = pageNumber % 2 === 0 ? pageNumber : pageNumber - 1;
  const sceneNumber = new Map<number, number>([
    [4, 1], [8, 2], [12, 3], [16, 4], [20, 5],
    [24, 6], [26, 7], [28, 8],
  ]).get(spreadStart);
  if (!sceneNumber) throw new Error(`UNMAPPED_PERSONALIZED_PAGE_${pageNumber}`);
  return {
    kind: pageNumber % 2 === 0 ? "scene-left" : "scene-right",
    pageNumbers: [spreadStart, spreadStart + 1],
    generationNumber: PERSONALIZED_CHILD_IMAGE_COUNT + sceneNumber,
  };
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
