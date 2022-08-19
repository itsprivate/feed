import { RunOptions } from "../interface.ts";
import adapters from "../adapters/mod.ts";
import {
  get,
  getCurrentKeysFilePath,
  readJSONFile,
  writeJSONFile,
} from "../util.ts";
import log from "../log.ts";

export default async function fetchSources(
  options: RunOptions,
) {
  const config = options.config;
  const sitesMap = config.sites;
  const siteIdentifiers = options.siteIdentifiers;
  for (const siteIdentifier of siteIdentifiers) {
    const siteConfig = sitesMap[siteIdentifier];
    const sources = siteConfig.sources;
    let total = 0;
    for (const source of sources) {
      const sourceUrl = source.url;
      const sourceType = source.type;
      const itemsPath = source.itemsPath || "";

      // fetch source, and parse it to item;
      const originItemResult = await fetch(sourceUrl);
      const originalJson = await originItemResult.json();

      // get items
      const originalItems = get(originalJson, itemsPath) as Record<
        string,
        unknown
      >[];
      log.info(
        `fetched ${originalItems.length} items from ${sourceUrl} for ${siteIdentifier}`,
      );
      const currentKeysPath = getCurrentKeysFilePath(siteIdentifier);
      let currentKeysJson: string[] = [];
      try {
        currentKeysJson = await readJSONFile(currentKeysPath);
      } catch (e) {
        log.debug(`read current keys file failed, ${e.message}`);
      }
      for (const originalItem of originalItems) {
        // parse item to formated item
        const item = new (adapters[sourceType])(
          originalItem,
          siteIdentifier,
        );

        if (!currentKeysJson.includes(item.getItemIdentifier())) {
          // not exists
          // save original item to file
          await writeJSONFile(
            item.getRawPath(),
            originalItem,
          );
          currentKeysJson.unshift(item.getItemIdentifier());
          log.debug(
            `fetched raw data to ${item.getRawPath()}`,
          );
          total++;
        }
      }
      // if keys length > 1000
      if (currentKeysJson.length > 1000) {
        currentKeysJson = currentKeysJson.slice(0, 1000);
      }
      await writeJSONFile(currentKeysPath, currentKeysJson);
      log.info(
        `saved ${total} items from ${sourceUrl} for ${siteIdentifier}`,
      );
    }
  }
}
