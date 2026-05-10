import { readdir, readFile, writeFile } from "node:fs/promises";
import { join, extname } from "node:path";

const ROOT = new URL("../src/", import.meta.url).pathname;
const TARGETS = [".mdx", ".tsx", ".ts"];
const PATTERN = /(\/img\/casos\/[^"' \n)]+)\.(png|jpe?g)/gi;

async function* walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else yield full;
  }
}

let filesChanged = 0;
let totalReplacements = 0;

for await (const file of walk(ROOT)) {
  if (!TARGETS.includes(extname(file))) continue;
  const original = await readFile(file, "utf8");
  let count = 0;
  const updated = original.replace(PATTERN, (_m, p1) => {
    count++;
    return `${p1}.webp`;
  });
  if (count > 0) {
    await writeFile(file, updated);
    console.log(`${file.replace(ROOT, "")}  (${count} replaced)`);
    filesChanged++;
    totalReplacements += count;
  }
}

console.log("---");
console.log(`Files changed: ${filesChanged}`);
console.log(`Total replacements: ${totalReplacements}`);
