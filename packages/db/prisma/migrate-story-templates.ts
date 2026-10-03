import { Prisma, PrismaClient, StoryTemplateSourceEnum } from "@prisma/client";
import { config as loadEnv } from "dotenv";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

// Workspace scripts run from packages/db, so load the repository .env for
// local exports while preserving any DATABASE_URL already supplied by CI/VPS.
loadEnv({ path: path.resolve(process.cwd(), "../../.env"), override: false });

type ExportedTemplate = {
  id: string;
  name: string;
  description: string;
  ageRange: string;
  category: string;
  prompts: Prisma.JsonValue;
  // Explicit alias for the complete narrative payload. `prompts` is retained
  // for compatibility with the StoryTemplate database column and may contain
  // additional future content fields.
  storyContent: Prisma.JsonValue;
  sampleImage: string | null;
  coverImage: string | null;
  isActive: boolean;
  difficulty: number;
  tags: string[];
  source: StoryTemplateSourceEnum;
  tagline: string | null;
  excerpt: string | null;
  nameFr: string | null;
  nameAr: string | null;
  descriptionFr: string | null;
  descriptionAr: string | null;
  taglineFr: string | null;
  taglineAr: string | null;
  excerptFr: string | null;
  excerptAr: string | null;
  emoji: string | null;
  audience: string;
  artStyle: string | null;
  review: Prisma.JsonValue;
  previews: Prisma.JsonValue;
  createdAt: string;
  updatedAt: string;
};

type ExportFile = {
  format: "mon-petit-hero-story-templates";
  version: 1;
  exportedAt: string;
  includesCustomTemplates: boolean;
  templates: ExportedTemplate[];
};

function argument(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function hasFlag(name: string): boolean {
  return process.argv.includes(name);
}

function defaultFile(): string {
  return path.resolve(process.cwd(), "story-templates-export.json");
}

async function exportTemplates(filePath: string) {
  const prisma = new PrismaClient();
  const includeCustom = hasFlag("--include-custom");

  try {
    const templates = await prisma.storyTemplate.findMany({
      where: includeCustom ? undefined : { source: StoryTemplateSourceEnum.PREDEFINED },
      orderBy: { createdAt: "asc" },
    });

    const output: ExportFile = {
      format: "mon-petit-hero-story-templates",
      version: 1,
      exportedAt: new Date().toISOString(),
      includesCustomTemplates: includeCustom,
      templates: templates.map((template) => ({
        id: template.id,
        name: template.name,
        description: template.description,
        ageRange: template.ageRange,
        category: template.category,
        prompts: template.prompts,
        storyContent: template.prompts,
        sampleImage: template.sampleImage,
        coverImage: template.coverImage,
        isActive: template.isActive,
        difficulty: template.difficulty,
        tags: template.tags,
        source: template.source,
        tagline: template.tagline,
        excerpt: template.excerpt,
        nameFr: template.nameFr,
        nameAr: template.nameAr,
        descriptionFr: template.descriptionFr,
        descriptionAr: template.descriptionAr,
        taglineFr: template.taglineFr,
        taglineAr: template.taglineAr,
        excerptFr: template.excerptFr,
        excerptAr: template.excerptAr,
        emoji: template.emoji,
        audience: template.audience,
        artStyle: template.artStyle,
        review: template.review,
        previews: template.previews,
        createdAt: template.createdAt.toISOString(),
        updatedAt: template.updatedAt.toISOString(),
      })),
    };

    await writeFile(filePath, `${JSON.stringify(output, null, 2)}\n`, "utf8");
    console.log(`Exported ${output.templates.length} story template(s) to ${filePath}`);
    console.log("Images are kept as their existing URLs; no users, orders, or generated stories were exported.");
  } finally {
    await prisma.$disconnect();
  }
}

function parseExportFile(value: unknown): ExportFile {
  if (!value || typeof value !== "object") throw new Error("Migration file must contain a JSON object");
  const file = value as Partial<ExportFile>;
  if (file.format !== "mon-petit-hero-story-templates" || file.version !== 1 || !Array.isArray(file.templates)) {
    throw new Error("Unsupported story template migration file");
  }
  return file as ExportFile;
}

async function importTemplates(filePath: string) {
  const contents = await readFile(filePath, "utf8");
  const migration = parseExportFile(JSON.parse(contents));
  const apply = hasFlag("--apply");
  const ids = new Set<string>();
  for (const template of migration.templates) {
    if (!template.id || ids.has(template.id)) throw new Error(`Duplicate or missing template ID: ${template.id}`);
    ids.add(template.id);
    if (!template.name || !template.description || !Array.isArray(template.tags)) {
      throw new Error(`Invalid template payload for ${template.id}`);
    }
    if (!Array.isArray(template.prompts) && (!template.prompts || typeof template.prompts !== "object")) {
      throw new Error(`Invalid prompts payload for ${template.id}`);
    }
  }

  if (!apply) {
    console.log(`DRY RUN: validated ${migration.templates.length} template(s) from ${filePath}.`);
    console.log("No database rows were changed. Re-run with --apply to update only these IDs.");
    return;
  }

  const prisma = new PrismaClient();

  try {
    await prisma.$transaction(async (transaction) => {
      for (const template of migration.templates) {
        const storyContent = template.storyContent ?? template.prompts;
        await transaction.storyTemplate.upsert({
          where: { id: template.id },
          update: {
            name: template.name,
            description: template.description,
            ageRange: template.ageRange,
            category: template.category,
            prompts: storyContent as Prisma.InputJsonValue,
            sampleImage: template.sampleImage,
            coverImage: template.coverImage,
            isActive: template.isActive,
            difficulty: template.difficulty,
            tags: template.tags,
            source: template.source,
            tagline: template.tagline,
            excerpt: template.excerpt,
            nameFr: template.nameFr,
            nameAr: template.nameAr,
            descriptionFr: template.descriptionFr,
            descriptionAr: template.descriptionAr,
            taglineFr: template.taglineFr,
            taglineAr: template.taglineAr,
            excerptFr: template.excerptFr,
            excerptAr: template.excerptAr,
            emoji: template.emoji,
            audience: template.audience,
            artStyle: template.artStyle,
            review: template.review as Prisma.InputJsonValue,
            previews: template.previews as Prisma.InputJsonValue,
          },
          create: {
            id: template.id,
            name: template.name,
            description: template.description,
            ageRange: template.ageRange,
            category: template.category,
            prompts: storyContent as Prisma.InputJsonValue,
            sampleImage: template.sampleImage,
            coverImage: template.coverImage,
            isActive: template.isActive,
            difficulty: template.difficulty,
            tags: template.tags,
            source: template.source,
            // User accounts are intentionally not part of this migration.
            ownerUserId: null,
            tagline: template.tagline,
            excerpt: template.excerpt,
            nameFr: template.nameFr,
            nameAr: template.nameAr,
            descriptionFr: template.descriptionFr,
            descriptionAr: template.descriptionAr,
            taglineFr: template.taglineFr,
            taglineAr: template.taglineAr,
            excerptFr: template.excerptFr,
            excerptAr: template.excerptAr,
            emoji: template.emoji,
            audience: template.audience,
            artStyle: template.artStyle,
            review: template.review as Prisma.InputJsonValue,
            previews: template.previews as Prisma.InputJsonValue,
            createdAt: new Date(template.createdAt),
            updatedAt: new Date(template.updatedAt),
          },
        });
      }
    });

    console.log(`Imported ${migration.templates.length} story template(s) from ${filePath}`);
    console.log("Existing rows with the same IDs were updated; other database records were unchanged.");
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  const [mode] = process.argv.slice(2);
  const filePath = path.resolve(argument("--file") ?? defaultFile());

  if (mode === "export") {
    await exportTemplates(filePath);
    return;
  }

  if (mode === "import") {
    await importTemplates(filePath);
    return;
  }

  throw new Error(
    "Usage: ts-node prisma/migrate-story-templates.ts export|import [--file path] [--include-custom] [--apply]",
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
