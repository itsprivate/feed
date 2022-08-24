import { fs, path } from "../deps.ts";
import { RunOptions } from "../interface.ts";
import adapters from "../adapters/mod.ts";
import Item from "../item.ts";
import {
  getDataRawPath,
  isDev,
  pathToSiteIdentifier,
  readJSONFile,
  siteIdentifierToPath,
  writeJSONFile,
} from "../util.ts";
import log from "../log.ts";
import { DEV_MODE_HANDLED_ITEMS } from "../constant.ts";
export default async function formatItems(
  options: RunOptions,
) {
  // get all 1-raw files
  // is exists raw files folder
  await fs.ensureDir(getDataRawPath());
  const config = options.config;
  let siteIdentifiers: string[] = [];

  for await (const dirEntry of Deno.readDir(getDataRawPath())) {
    if (dirEntry.isDirectory && !dirEntry.name.startsWith(".")) {
      siteIdentifiers.push(pathToSiteIdentifier(dirEntry.name));
    }
  }
  const sites = options.siteIdentifiers;
  if (sites && Array.isArray(sites)) {
    siteIdentifiers = siteIdentifiers.filter((siteIdentifier) => {
      return (sites as string[]).includes(siteIdentifier);
    });
  }
  if (siteIdentifiers.length > 0) {
    for (const siteIdentifier of siteIdentifiers) {
      const files: string[] = [];
      try {
        let totalFiles = 0;
        for await (
          const entry of fs.walk(
            getDataRawPath() + "/" + siteIdentifierToPath(siteIdentifier),
          )
        ) {
          if (isDev()) {
            if (totalFiles >= DEV_MODE_HANDLED_ITEMS) {
              log.info(`dev mode, only take ${DEV_MODE_HANDLED_ITEMS} files`);
              break;
            }
          }
          if (entry.isFile && entry.path.endsWith(".json")) {
            files.push(entry.path);
            totalFiles += 1;
          }
        }
      } catch (e) {
        throw e;
      }
      let total = 0;

      if (files.length > 0) {
        for (const file of files) {
          const filenmae = path.basename(file);
          const parsedFilename = Item.parseItemIdentifier(filenmae);
          const originalItem = await readJSONFile(file) as Record<
            string,
            unknown
          >;
          const item = new (adapters[parsedFilename.type])(
            originalItem,
            parsedFilename.targetSiteIdentifier,
          );
          await item.init();
          const itemJson = await item.getFormatedItem();

          // write formated item to file
          await writeJSONFile(
            item.getFormatedPath(),
            itemJson,
          );
          // then delete raw file
          if (!isDev()) {
            await Deno.remove(file);
          }
          total += 1;
          log.debug(
            `formated item to ${item.getFormatedPath()}`,
          );
        }
      }
      log.info(
        `formated ${total} items`,
      );
    }
  }
}
