import fs from "fs";
import path from "path";
import { prismaClient } from "./src/lib/prisma";

async function main() {
  const rows = await prismaClient.storyTemplate.findMany({ select: { id: true, coverImage: true, previews: true } });
  const referenced = new Set<string>();
  for (const r of rows) {
    for (const u of [r.coverImage, ...((r.previews as any[]) ?? []).map((p) => p.src)]) {
      if (u && u.includes("/assets/")) referenced.add(path.basename(u));
    }
  }
  const onDisk = new Set<string>();
  for (const folder of ["covers", "previews"]) {
    const dir = path.join(process.cwd(), "assets", folder);
    if (!fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir)) onDisk.add(f);
  }
  console.log(`referenced by DB : ${referenced.size}`);
  console.log(`on disk          : ${onDisk.size}`);
  const missing = [...referenced].filter((f) => !onDisk.has(f));
  const orphan = [...onDisk].filter((f) => !referenced.has(f));
  console.log(`\ndangling refs (DB points at a missing file): ${missing.length}`);
  for (const f of missing) console.log("   " + f);
  console.log(`\nunreferenced files on disk: ${orphan.length}`);
  for (const f of orphan) console.log("   " + f);
}
main().then(() => prismaClient.$disconnect()).then(() => process.exit(0));
