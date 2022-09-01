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
      await fs.copy(entry.path, distPath, { overwrite: true });
    }
  }
  // copy site static
  for await (const entry of fs.walk(`./assets-by-site/${siteIdentifier}`)) {
    if (entry.isFile && !entry.name.startsWith(".")) {
      const distPath = getDistFilePath(
        siteIdentifier,
        path.relative(
          path.join("./assets-by-site/", siteIdentifier),
          entry.path,
        ),
      );
      index++;
      await fs.copy(entry.path, distPath, { overwrite: true });
    }
  }

  log.info(`copied ${index} static files to dist`);
}
