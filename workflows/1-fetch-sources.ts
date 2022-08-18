import { RunOptions } from "../interface.ts";
import adapters from "../adapters/mod.ts";
import { get, writeJSONFile } from "../util.ts";
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
      for (const originalItem of originalItems) {
        // parse item to formated item
        const item = new (adapters[sourceType])(
          originalItem,
          siteIdentifier,
        );
        // save original item to file
        await writeJSONFile(
          item.getRawPath(),
          originalItem,
        );
        log.debug(
          `fetched raw data to ${item.getRawPath()}`,
        );
      }
    }
  }
}
