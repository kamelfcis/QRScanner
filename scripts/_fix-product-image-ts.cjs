const fs = require("fs");
const p = "src/lib/ai/product-image.ts";
let s = fs.readFileSync(p, "utf8");
const old = "    const mimeType = inline?.mimeType ?? inline?.mime_type ?? 'image/png';";
const neu = `    const mimeType =
      (inline && "mimeType" in inline ? inline.mimeType : undefined) ??
      (inline && "mime_type" in inline ? inline.mime_type : undefined) ??
      "image/png";`;
if (!s.includes(old)) {
  console.error("pattern not found");
  process.exit(1);
}
fs.writeFileSync(p, s.replace(old, neu), "utf8");
console.log("fixed");