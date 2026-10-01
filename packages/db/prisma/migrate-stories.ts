import { PrismaClient } from "@prisma/client";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

type ExportFile = {
  format: "mon-petit-hero-stories";
  version: 1;
  exportedAt: string;
  users: Array<{
    id: string; clerkId: string; email: string; name: string | null;
    profilePicture: string | null; trialGenerations: number;
    createdAt: string; updatedAt: string;
  }>;
  stories: Array<{
    id: string; title: string; userId: string; status: string;
    createdAt: string; updatedAt: string; childName: string | null;
    childAge: number | null; referenceImageUrl: string | null;
    storyLength: string; category: string; dedication: string | null;
    templateId: string | null; includeAudio: boolean; voiceId: string | null;
    isPublic: boolean; shareToken: string | null; readCount: number;
    tags: string[]; language: string; readingTime: number | null;
    completedAt: string | null; pdfUrl: string | null;
    pages: Array<{
      id: string; pageNumber: number; content: string; imageUrl: string | null;
      audioUrl: string | null; imagePrompt: string; falAiRequestId: string | null;
      status: string; createdAt: string; updatedAt: string;
    }>;
    analytics: {
      id: string; views: number; shares: number; downloads: number;
      avgReadTime: number | null; lastReadAt: string | null;
      createdAt: string; updatedAt: string;
    } | null;
  }>;
};

const filePath = () => {
  const index = process.argv.indexOf("--file");
  return path.resolve(process.cwd(), index >= 0 ? process.argv[index + 1] : "stories-export.json");
};

async function exportStories(outputPath: string) {
  const prisma = new PrismaClient();
  try {
    const stories = await prisma.story.findMany({
      include: { pages: { orderBy: { pageNumber: "asc" } }, analytics: true },
      orderBy: { createdAt: "asc" },
    });
    const userIds = [...new Set(stories.map((story) => story.userId))];
    const users = await prisma.user.findMany({ where: { id: { in: userIds } } });

    const output: ExportFile = {
      format: "mon-petit-hero-stories",
      version: 1,
      exportedAt: new Date().toISOString(),
      users: users.map((user) => ({
        id: user.id, clerkId: user.clerkId, email: user.email, name: user.name,
        profilePicture: user.profilePicture, trialGenerations: user.trialGenerations,
        createdAt: user.createdAt.toISOString(), updatedAt: user.updatedAt.toISOString(),
      })),
      stories: stories.map((story) => ({
        id: story.id, title: story.title, userId: story.userId, status: story.status,
        createdAt: story.createdAt.toISOString(), updatedAt: story.updatedAt.toISOString(),
        childName: story.childName, childAge: story.childAge, referenceImageUrl: story.referenceImageUrl,
        storyLength: story.storyLength, category: story.category, dedication: story.dedication,
        templateId: story.templateId, includeAudio: story.includeAudio, voiceId: story.voiceId,
        isPublic: story.isPublic, shareToken: story.shareToken, readCount: story.readCount,
        tags: story.tags, language: story.language, readingTime: story.readingTime,
        completedAt: story.completedAt?.toISOString() ?? null, pdfUrl: story.pdfUrl,
        pages: story.pages.map((page) => ({
          id: page.id, pageNumber: page.pageNumber, content: page.content,
          imageUrl: page.imageUrl, audioUrl: page.audioUrl, imagePrompt: page.imagePrompt,
          falAiRequestId: page.falAiRequestId, status: page.status,
          createdAt: page.createdAt.toISOString(), updatedAt: page.updatedAt.toISOString(),
        })),
        analytics: story.analytics ? {
          id: story.analytics.id, views: story.analytics.views, shares: story.analytics.shares,
          downloads: story.analytics.downloads, avgReadTime: story.analytics.avgReadTime,
          lastReadAt: story.analytics.lastReadAt?.toISOString() ?? null,
          createdAt: story.analytics.createdAt.toISOString(), updatedAt: story.analytics.updatedAt.toISOString(),
        } : null,
      })),
    };
    await writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`, "utf8");
    console.log(`Exported ${output.stories.length} story/stories, ${output.stories.reduce((n, story) => n + story.pages.length, 0)} page(s), and ${output.users.length} related user(s).`);
    console.log(`Saved to ${outputPath}`);
  } finally {
    await prisma.$disconnect();
  }
}

async function importStories(inputPath: string) {
  const migration = JSON.parse(await readFile(inputPath, "utf8")) as ExportFile;
  if (migration.format !== "mon-petit-hero-stories" || migration.version !== 1) {
    throw new Error("Unsupported stories migration file");
  }
  const prisma = new PrismaClient();
  try {
    await prisma.$transaction(async (transaction) => {
      const userIds = new Map<string, string>();
      for (const user of migration.users) {
        const existing = await transaction.user.findFirst({
          where: { OR: [{ id: user.id }, { clerkId: user.clerkId }, { email: user.email }] },
        });
        if (existing) {
          userIds.set(user.id, existing.id);
          continue;
        }
        const created = await transaction.user.create({
          data: {
            id: user.id, clerkId: user.clerkId, email: user.email, name: user.name,
            profilePicture: user.profilePicture, trialGenerations: user.trialGenerations,
            createdAt: new Date(user.createdAt), updatedAt: new Date(user.updatedAt),
          },
        });
        userIds.set(user.id, created.id);
      }

      for (const story of migration.stories) {
        const userId = userIds.get(story.userId);
        if (!userId) throw new Error(`Missing related user ${story.userId} for story ${story.id}`);
        if (story.templateId && !(await transaction.storyTemplate.findUnique({ where: { id: story.templateId }, select: { id: true } }))) {
          throw new Error(`Missing template ${story.templateId}. Import story templates before importing stories.`);
        }
        await transaction.story.upsert({
          where: { id: story.id },
          update: {
            title: story.title, userId, status: story.status as never, childName: story.childName,
            childAge: story.childAge, referenceImageUrl: story.referenceImageUrl, storyLength: story.storyLength as never,
            category: story.category, dedication: story.dedication, templateId: story.templateId,
            includeAudio: story.includeAudio, voiceId: story.voiceId, isPublic: story.isPublic,
            shareToken: story.shareToken, readCount: story.readCount, tags: story.tags, language: story.language,
            readingTime: story.readingTime, completedAt: story.completedAt ? new Date(story.completedAt) : null, pdfUrl: story.pdfUrl,
          },
          create: {
            id: story.id, title: story.title, userId, status: story.status as never,
            childName: story.childName, childAge: story.childAge, referenceImageUrl: story.referenceImageUrl,
            storyLength: story.storyLength as never, category: story.category, dedication: story.dedication,
            templateId: story.templateId, includeAudio: story.includeAudio, voiceId: story.voiceId,
            isPublic: story.isPublic, shareToken: story.shareToken, readCount: story.readCount,
            tags: story.tags, language: story.language, readingTime: story.readingTime,
            completedAt: story.completedAt ? new Date(story.completedAt) : null, pdfUrl: story.pdfUrl,
            createdAt: new Date(story.createdAt), updatedAt: new Date(story.updatedAt),
          },
        });
        await transaction.storyPage.deleteMany({ where: { storyId: story.id } });
        await transaction.storyPage.createMany({ data: story.pages.map((page) => ({
          id: page.id, storyId: story.id, pageNumber: page.pageNumber, content: page.content,
          imageUrl: page.imageUrl, audioUrl: page.audioUrl, imagePrompt: page.imagePrompt,
          falAiRequestId: page.falAiRequestId, status: page.status as never,
          createdAt: new Date(page.createdAt), updatedAt: new Date(page.updatedAt),
        })) });
        if (story.analytics) await transaction.storyAnalytics.upsert({
          where: { storyId: story.id },
          update: { views: story.analytics.views, shares: story.analytics.shares, downloads: story.analytics.downloads, avgReadTime: story.analytics.avgReadTime, lastReadAt: story.analytics.lastReadAt ? new Date(story.analytics.lastReadAt) : null },
          create: { id: story.analytics.id, storyId: story.id, views: story.analytics.views, shares: story.analytics.shares, downloads: story.analytics.downloads, avgReadTime: story.analytics.avgReadTime, lastReadAt: story.analytics.lastReadAt ? new Date(story.analytics.lastReadAt) : null, createdAt: new Date(story.analytics.createdAt), updatedAt: new Date(story.analytics.updatedAt) },
        });
      }
    });
    console.log(`Imported ${migration.stories.length} story/stories with their pages and analytics.`);
  } finally { await prisma.$disconnect(); }
}

async function main() {
  const mode = process.argv[2];
  const target = filePath();
  if (mode === "export") return exportStories(target);
  if (mode === "import") return importStories(target);
  throw new Error("Usage: ts-node prisma/migrate-stories.ts export|import --file path");
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
