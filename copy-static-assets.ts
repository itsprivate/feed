import { fs, path } from "./deps.ts";
import { getDistFilePath } from "./util.ts";
import log from "./log.ts";
export default async function copyStaticAssets(siteIdentifier: string) {
  let index = 0;
  for await (const entry of fs.walk("./static")) {
    if (entry.isFile && !entry.name.startsWith(".")) {
      const distPath = getDistFilePath(
        siteIdentifier,
        path.relative("./static", entry.path),
      );
      index++;
      await fs.copy(entry.path, distPath);
    }
  }
  log.info(`copied ${index} static files to dist`);
}
