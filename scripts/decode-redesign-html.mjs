/**
 * Unpacks the __bundler/template JSON string from StudentSpace Redesign.html
 * into a standalone HTML file for design reference.
 *
 * Usage: node scripts/decode-redesign-html.mjs [path-to-bundled.html] [output-path]
 */
import fs from "fs";
import path from "path";

const input =
  process.argv[2] ??
  path.join(process.env.USERPROFILE ?? "", "Downloads", "StudentSpace Redesign.html");
const output =
  process.argv[3] ??
  path.join(process.cwd(), "design", "StudentSpace-Redesign-decoded.html");

const html = fs.readFileSync(input, "utf8");
const m = html.match(/<script type="__bundler\/template">\s*([\s\S]*?)\s*<\/script>/);
if (!m) {
  console.error("Could not find __bundler/template in:", input);
  process.exit(1);
}

const template = JSON.parse(m[1].trim());
if (typeof template !== "string") {
  console.error("Expected template to be a JSON string");
  process.exit(1);
}

fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, template, "utf8");
console.log("Wrote", output, `(${(template.length / 1024).toFixed(1)} KB)`);
