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
 * Page 1 is the child-focused front cover. The next eight child pages each
 * precede a scene spread. Two final scene spreads complete the 29 generated
 * pages, and page 30 is always the existing reusable closing cover.
 */
export function getPersonalizedPageSlot(pageNumber: number): PersonalizedPageSlot {
  if (pageNumber === PERSONALIZED_PRINT_PAGE_COUNT) {
    return { kind: "final-cover", pageNumbers: [pageNumber] };
  }
  if (pageNumber === 1) {
    return { kind: "child", pageNumbers: [pageNumber], generationNumber: 1 };
  }

  // Eight child + scene pairs occupy pages 2..25.
  if (pageNumber >= 2 && pageNumber <= 25) {
    const offset = pageNumber - 2;
    const cycle = Math.floor(offset / 3);
    const position = offset % 3;
    if (position === 0) {
      return { kind: "child", pageNumbers: [pageNumber], generationNumber: cycle + 2 };
    }
    const sceneNumber = cycle + 1;
    return {
      kind: position === 1 ? "scene-left" : "scene-right",
      pageNumbers: [position === 1 ? pageNumber : pageNumber - 1, position === 1 ? pageNumber + 1 : pageNumber],
      generationNumber: 9 + sceneNumber,
    };
  }

  // Two additional scene spreads occupy pages 26..29.
  const sceneNumber = pageNumber <= 27 ? 9 : 10;
  return {
    kind: pageNumber % 2 === 0 ? "scene-left" : "scene-right",
    pageNumbers: pageNumber % 2 === 0 ? [pageNumber, pageNumber + 1] : [pageNumber - 1, pageNumber],
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
  return slots.sort((a, b) => (a.generationNumber ?? 0) - (b.generationNumber ?? 0));
}
