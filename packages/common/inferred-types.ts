import { z } from "zod";
import { StoryGenerationInputSchema } from "./types";

export type StoryGenerationInput = z.infer<typeof StoryGenerationInputSchema>;