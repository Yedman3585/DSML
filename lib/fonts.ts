import fs from "node:fs";
import path from "node:path";

// Satori needs explicit font files; cache them after the first cold start.
let cached: { name: string; data: Buffer; weight: 400 | 700; style: "normal" }[] | null = null;

export function loadFonts() {
  if (cached) return cached;

  const dir = path.join(process.cwd(), "assets", "fonts");
  cached = [
    { name: "Roboto", data: fs.readFileSync(path.join(dir, "Roboto-Regular.woff")), weight: 400, style: "normal" },
    { name: "Roboto", data: fs.readFileSync(path.join(dir, "Roboto-Bold.woff")), weight: 700, style: "normal" },
  ];
  return cached;
}
