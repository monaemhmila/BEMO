import { z } from "zod";

export const StoryGenerationInputSchema = z.object({
  templateId: z.string().min(1),
  childName: z.string().optional(),
  childAge: z.number().min(1).max(20).optional(),
  gender: z.enum(["boy", "girl"]).optional(),
  artStyle: z.string().optional(),
  dedication: z.string().optional(),
  childImage: z.string().optional(),
  language: z.string().optional().default("en"),
});