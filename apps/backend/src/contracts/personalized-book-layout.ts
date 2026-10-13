/** Printed personalized-book layout: 30 square pages, 19 AI generations. */
export const PERSONALIZED_PRINT_PAGE_COUNT = 30;
export const PERSONALIZED_GENERATED_PRINT_PAGE_COUNT = 29;
export const PERSONALIZED_IMAGE_GENERATION_COUNT = 19;
export const PERSONALIZED_CHILD_IMAGE_COUNT = 9;
export const PERSONALIZED_SCENE_IMAGE_COUNT = 10;

export type PersonalizedPageKind = "child" | "scene-left" | "scene-right" | "final-cover";

export interface PersonalizedPageSlot {
  kind: PersonalizedPageKind;
  pageNumbers: number[];
  generationNumber?: number;
}

/**
 * Page 1 is the child-focused front cover. The next child pages are grouped
 * into pairs before each landscape scene spread, so the reader sees a stable
 * rhythm instead of alternating child/scene pages. There are nine child
 * generations and ten two-page scene spreads in the existing 19-generation
 * budget; after the four complete child pairs, the remaining scene spreads
 * finish pages 18..29. Page 30 is always the existing reusable closing cover.
 */
export function getPersonalizedPageSlot(pageNumber: number): PersonalizedPageSlot {
  if (pageNumber === PERSONALIZED_PRINT_PAGE_COUNT) {
    return { kind: "final-cover", pageNumbers: [pageNumber] };
  }
  if (pageNumber === 1) {
    return { kind: "child", pageNumbers: [pageNumber], generationNumber: 1 };
  }

  // The first four groups are: child, child, scene-left, scene-right.
  // This gives the intended visual rhythm while retaining the nine child /
  // ten scene generation counts.
  const groupedChildPages = new Map<number, number>([
    [2, 2], [3, 3],
    [6, 4], [7, 5],
    [10, 6], [11, 7],
    [14, 8], [15, 9],
  ]);
  const childGeneration = groupedChildPages.get(pageNumber);
  if (childGeneration) {
    return { kind: "child", pageNumbers: [pageNumber], generationNumber: childGeneration };
  }

  // All remaining non-cover pages are ordered scene spreads. Every landscape
  // generation always owns two adjacent physical pages.
  const spreadStart = pageNumber % 2 === 0 ? pageNumber : pageNumber - 1;
  const sceneNumber = new Map<number, number>([
    [4, 1], [8, 2], [12, 3], [16, 4], [18, 5],
    [20, 6], [22, 7], [24, 8], [26, 9], [28, 10],
  ]).get(spreadStart);
  if (!sceneNumber) throw new Error(`UNMAPPED_PERSONALIZED_PAGE_${pageNumber}`);
  return {
    kind: pageNumber % 2 === 0 ? "scene-left" : "scene-right",
    pageNumbers: [spreadStart, spreadStart + 1],
    generationNumber: 9 + sceneNumber,
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
