import { readdir, stat, unlink } from "node:fs/promises";
import { join, extname } from "node:path";
import sharp from "sharp";

const ROOT = new URL("../public/img/casos/", import.meta.url).pathname;
const QUALITY = 82;

async function* walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else yield full;
  }
}

let converted = 0;
let savedBytes = 0;
let totalIn = 0;
let totalOut = 0;

for await (const file of walk(ROOT)) {
  const ext = extname(file).toLowerCase();
  if (![".png", ".jpg", ".jpeg"].includes(ext)) continue;

  const out = file.replace(/\.(png|jpe?g)$/i, ".webp");
  const beforeStat = await stat(file);

  await sharp(file)
    .webp({ quality: QUALITY, effort: 5 })
    .toFile(out);

  const afterStat = await stat(out);
  await unlink(file);

  totalIn += beforeStat.size;
  totalOut += afterStat.size;
  savedBytes += beforeStat.size - afterStat.size;
  converted++;

  const pct = ((1 - afterStat.size / beforeStat.size) * 100).toFixed(0);
  console.log(
    `${file.replace(ROOT, "")}  ${(beforeStat.size / 1024).toFixed(0)}KB → ${(afterStat.size / 1024).toFixed(0)}KB  (-${pct}%)`,
  );
}

console.log("---");
console.log(`Converted ${converted} files`);
console.log(`Total: ${(totalIn / 1024 / 1024).toFixed(1)}MB → ${(totalOut / 1024 / 1024).toFixed(1)}MB`);
console.log(`Saved: ${(savedBytes / 1024 / 1024).toFixed(1)}MB`);
