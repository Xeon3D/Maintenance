// Deep-merges a JSON fragment into messages/<locale>.json.
// Usage: node scripts/merge-messages.mjs <locale> <fragment.json>
import { readFileSync, writeFileSync } from "node:fs";

const [locale, fragmentPath] = process.argv.slice(2);
if (!locale || !fragmentPath) {
  console.error("Usage: node scripts/merge-messages.mjs <locale> <fragment.json>");
  process.exit(1);
}

const target = `messages/${locale}.json`;
const base = JSON.parse(readFileSync(target, "utf8"));
const fragment = JSON.parse(readFileSync(fragmentPath, "utf8"));

function merge(a, b) {
  for (const [k, v] of Object.entries(b)) {
    a[k] = v && typeof v === "object" && !Array.isArray(v) ? merge(a[k] ?? {}, v) : v;
  }
  return a;
}

writeFileSync(target, JSON.stringify(merge(base, fragment), null, 2) + "\n");
console.log(`Merged ${fragmentPath} into ${target}`);
