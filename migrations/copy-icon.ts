import { fs, path } from "../deps.ts";
import { getDistFilePath } from "../util.ts";
import log from "../log.ts";
export default async function copyStaticAssets() {
  let index = 0;
  const folders: string[] = [];
  const map: Record<string, string> = {
    "ask": "ask",
    "crp": "crypto",
    "dep": "depth",
    "dev": "dev",
    "ec": "economist",
    "hn": "hn",
    "news": "news",
    "ny": "nytimes",
    "ph": "ph",
    "qu": "quora",
    "rs": "stocks",
    "rt": "reddit",
    "sp": "sideproject",
    "wsj": "wsj",
  };
  for await (const entry of Deno.readDir("../inbox/universe/apps")) {
    if (entry.isDirectory && !entry.name.startsWith(".")) {
      let filename = "avatar.png";

      const sourcePath = path.join(
        "../inbox/universe/apps",
        entry.name,
        "static/avatar.png",
      );
      index++;
      const distPath = path.join(
        "./assets-by-site/",
        map[entry.name],
        "icon.png",
      );
      log.info(`${index} - ${sourcePath} -> ${distPath}`);
      await fs.ensureDir(path.dirname(distPath));
      await fs.copy(sourcePath, distPath, { overwrite: true });
    }
  }
  log.info(`copied ${index} static files to dist`);
}

if (import.meta.main) {
  copyStaticAssets();
}
