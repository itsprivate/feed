import { colors, datetime, flags, fs, path, YAML } from "../deps.ts";
import { Config, FormatedItem, RunOptions } from "../interface.ts";
import adapters from "../adapters/mod.ts";
import Item from "../item.ts";
import {
  get,
  getArchivedItemsFilePath,
  getConfig,
  getCurrentItemsFilePath,
  getCurrentToBeArchivedItemsFilePath,
  getDataCurrentItemsPath,
  getDataFormatedPath,
  getDataRawPath,
  getDataTranslatedPath,
  getDistPath,
  isDev,
  readJSONFile,
  writeJSONFile,
} from "../util.ts";
import log from "../log.ts";
import Translation from "../translate.ts";
import {
  DEV_MODE_HANDLED_ITEMS,
  MAX_ITEMS_PER_PAGE,
  TRANSLATED_ITEMS_PER_PAGE,
} from "../constant.ts";

export default async function fetchSources(
  options: RunOptions | undefined = {},
) {
  const config = await getConfig();
  const sitesMap = config.sites;
  let domains = Object.keys(sitesMap);
  const sites = options.sites;
  if (sites && Array.isArray(sites)) {
    domains = domains.filter((domain) => {
      return (sites as string[]).includes(domain);
    });
  }
  for (const domain of domains) {
    const siteConfig = sitesMap[domain];
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
        `fetched ${originalItems.length} items from ${sourceUrl} for ${domain}`,
      );
      for (const originalItem of originalItems) {
        // parse item to formated item
        const item = new (adapters[sourceType])(
          originalItem,
          domain,
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
