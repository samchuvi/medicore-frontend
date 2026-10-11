// Rename the product and/or change its colour in one go.
//
//   node rebrand.mjs --color "#1565C0"                 (new colour only)
//   node rebrand.mjs --name "My Product"               (new name only)
//   node rebrand.mjs --name "My Product" --color "#1565C0"
//   add --dry to see what would change without touching any file.
//
// Give it ONE main colour; the darker and lighter shades are worked out for you.
// This changes the platform's own look (login page when no hospital is chosen, the
// platform owner's screens). Each hospital's own logo and colour are set on the
// Hospitals screen ("Logo & colour") and need no code change.
import fs from "node:fs";

const args = process.argv.slice(2);
const get = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
const dry = args.includes("--dry");
const newName = get("--name");
const newColor = get("--color");
if (!newName && !newColor) { console.log('Nothing to do. Use --color "#RRGGBB" and/or --name "New Name". Add --dry to preview.'); process.exit(0); }
if (newColor && !/^#[0-9a-fA-F]{6}$/.test(newColor)) { console.error('Colour must look like "#1565C0".'); process.exit(1); }

const edit = (file, fn) => {
  const before = fs.readFileSync(file, "utf8"); const after = fn(before);
  if (after === before) { console.log(`unchanged  ${file}`); return; }
  console.log(`${dry ? "would change" : "changed"}  ${file}`);
  if (!dry) fs.writeFileSync(file, after);
};

let oldName = "MediCore HMS";
edit("src/config.js", (s) => {
  const m = /export const PLATFORM_NAME = "([^"]*)";/.exec(s); if (m) oldName = m[1];
  if (newName) s = s.replace(/(export const PLATFORM_NAME = ")[^"]*(";)/, `$1${newName.replace(/"/g, '\\"')}$2`);
  if (newColor) s = s.replace(/(export const PLATFORM_COLOR = ")[^"]*(";)/, `$1${newColor.toUpperCase()}$2`);
  return s;
});
if (newName) edit("index.html", (s) => s.replace(/<title>[^<]*<\/title>/, `<title>${newName.replace(/</g, "&lt;")}</title>`));
console.log(dry ? "\nPreview only — nothing was written." : `\nDone. Name: ${newName || oldName}${newColor ? `, colour: ${newColor.toUpperCase()}` : ""}. Restart the dev server (or redeploy) to see it.`);
