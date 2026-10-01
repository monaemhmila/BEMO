import { PrismaClient } from "@prisma/client";

const COPY: Record<string, Record<string, string>> = {
  "lets-count-1-10": {
    nameFr: "Comptons ! De 1 à 10",
    nameAr: "هيا نعدّ! من 1 إلى 10",
    descriptionFr: "Une aventure ludique où l'enfant compte des animaux de un à cinq, puis découvre des fruits colorés en comptant de six à dix.",
    descriptionAr: "مغامرة مرحة يعدّ فيها الطفل الحيوانات من واحد إلى خمسة، ثم يكتشف الفواكه الملونة وهو يعدّ من ستة إلى عشرة.",
    taglineFr: "Compte les animaux, compte les fruits et découvre les nombres de 1 à 10 !",
    taglineAr: "عدّ الحيوانات والفواكه واكتشف الأرقام من 1 إلى 10!",
    excerptFr: "L'enfant commence une aventure de comptage avec des animaux sympathiques. Puis un jardin de fruits colorés apparaît pour faire découvrir les nombres de six à dix.",
    excerptAr: "يبدأ الطفل مغامرة ممتعة في العد مع حيوانات لطيفة، ثم تظهر حديقة فواكه ملونة لتعرّفه إلى الأعداد من ستة إلى عشرة.",
  },
  "my-abc-adventure": {
    nameFr: "Mon aventure avec l'alphabet",
    nameAr: "مغامرتي مع الحروف",
    descriptionFr: "Une aventure d'apprentissage où l'enfant explore l'alphabet deux lettres à la fois et découvre un mot familier pour chaque lettre dans la langue choisie.",
    descriptionAr: "مغامرة تعليمية يستكشف فيها الطفل الحروف حرفين في كل مرة، ويكتشف كلمة مألوفة لكل حرف باللغة المختارة.",
    taglineFr: "Chaque lettre ouvre la porte vers un nouveau mot !",
    taglineAr: "كل حرف يفتح الباب أمام كلمة جديدة!",
    excerptFr: "L'enfant commence une aventure colorée dans l'alphabet et découvre deux nouvelles lettres à la fois. Chaque lettre est associée à un mot simple et familier dans la langue choisie.",
    excerptAr: "يبدأ الطفل مغامرة ملونة في عالم الحروف، فيكتشف حرفين جديدين في كل مرة، ويربط كل حرف بكلمة بسيطة ومألوفة باللغة المختارة.",
  },
};

/**
 * Backfills translations for rows already in the database without replacing
 * translations that an administrator has edited. It is safe to run repeatedly.
 */
async function main() {
  const prisma = new PrismaClient();
  try {
    let updated = 0;

    for (const [id, copy] of Object.entries(COPY)) {
      const result = await prisma.$executeRawUnsafe(
        `UPDATE "StoryTemplate"
         SET "nameFr" = COALESCE(NULLIF("nameFr", ''), $2),
             "nameAr" = COALESCE(NULLIF("nameAr", ''), $3),
             "descriptionFr" = COALESCE(NULLIF("descriptionFr", ''), $4),
             "descriptionAr" = COALESCE(NULLIF("descriptionAr", ''), $5),
             "taglineFr" = COALESCE(NULLIF("taglineFr", ''), $6),
             "taglineAr" = COALESCE(NULLIF("taglineAr", ''), $7),
             "excerptFr" = COALESCE(NULLIF("excerptFr", ''), $8),
             "excerptAr" = COALESCE(NULLIF("excerptAr", ''), $9)
         WHERE "id" = $1
           AND (NULLIF("nameFr", '') IS NULL OR NULLIF("nameAr", '') IS NULL
             OR NULLIF("descriptionFr", '') IS NULL OR NULLIF("descriptionAr", '') IS NULL
             OR NULLIF("taglineFr", '') IS NULL OR NULLIF("taglineAr", '') IS NULL
             OR NULLIF("excerptFr", '') IS NULL OR NULLIF("excerptAr", '') IS NULL)`,
        id,
        copy.nameFr,
        copy.nameAr,
        copy.descriptionFr,
        copy.descriptionAr,
        copy.taglineFr,
        copy.taglineAr,
        copy.excerptFr,
        copy.excerptAr,
      );
      if (result === 0) continue;
      updated += 1;
      console.log(`Updated localized copy: ${id}`);
    }

    console.log(`Backfill complete: ${updated} template(s) updated.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
