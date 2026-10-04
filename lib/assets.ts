import fs from "node:fs";
import path from "node:path";

let dsmlIconDataUri: string | null = null;

export function loadDsmlIconDataUri() {
  if (dsmlIconDataUri) return dsmlIconDataUri;

  const iconPath = path.join(process.cwd(), "public", "icons", "dsml-kz.svg");
  const icon = fs.readFileSync(iconPath);
  dsmlIconDataUri = `data:image/svg+xml;base64,${icon.toString("base64")}`;

  return dsmlIconDataUri;
}
