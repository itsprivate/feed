import { RunOptions, Task } from "../interface.ts";
import adapters from "../adapters/mod.ts";
import {
  get,
  getCurrentKeysFilePath,
  readJSONFile,
  writeJSONFile,
} from "../util.ts";
import { parseFeed } from "../deps.ts";
import log from "../log.ts";

export default async function fetchSources(
  options: RunOptions,
): Promise<{ postTasks: Task[] }> {
  const config = options.config;
  const sitesMap = config.sites;
  const siteIdentifiers = options.siteIdentifiers;
  const postTasks: Task[] = [];
  for (const siteIdentifier of siteIdentifiers) {
    const siteConfig = sitesMap[siteIdentifier];
    const sources = siteConfig.sources || [];
    let total = 0;
    for (const source of sources) {
      const sourceUrl = source.url;
      const sourceType = source.type;
      let itemsPath = source.itemsPath || "";
      const rules = source.rules || [];
      // fetch source, and parse it to item;
      const originItemResult = await fetch(sourceUrl);
      let originalJson;
      if (sourceType === "rss" || sourceType === "googlenews") {
        const xml = await originItemResult.text();
        originalJson = await parseFeed(xml);
        itemsPath = "entries";
      } else {
        originalJson = await originItemResult.json();
      }

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
      let index = 0;
      for (const originalItem of originalItems) {
        // check rules
        let isAllRulesFine = true;
        for (const rule of rules) {
          const { key, value, type } = rule;
          if (type === "limit") {
            if ((index + 1) > Number(value)) {
              isAllRulesFine = false;
              break;
            }
          } else {
            const originalValue = get(originalItem, key);
            if (type === "greater") {
              if (Number(originalValue) <= Number(value)) {
                isAllRulesFine = false;
                break;
              }
            } else if (type === "equal") {
              if (originalValue !== value) {
                isAllRulesFine = false;
                break;
              }
            } else if (type === "notEqual") {
              if (originalValue === value) {
                isAllRulesFine = false;
                break;
              }
            } else if (type === "include") {
              if (!(originalValue as string[]).includes(value)) {
                isAllRulesFine = false;
                break;
              }
            } else if (type === "notInclude") {
              if ((originalValue as string[]).includes(value)) {
                isAllRulesFine = false;
                break;
              }
            } else if (type === "notExist") {
              if (originalValue) {
                isAllRulesFine = false;
                break;
              }
            } else if (type === "exist") {
              if (!originalValue) {
                isAllRulesFine = false;
                break;
              }
            } else if (type === "notMatch") {
              if ((originalValue as string).match(value)) {
                isAllRulesFine = false;
                break;
              }
            } else if (type === "match") {
              if (!(originalValue as string).match(value)) {
                isAllRulesFine = false;
                break;
              }
            } else if (type === "greaterEqual") {
              console.log("originalValue", originalValue);
              console.log("value", value);
              if (Number(originalValue) < Number(value)) {
                isAllRulesFine = false;
                break;
              }
            } else if (type === "less") {
              if (Number(originalValue) >= Number(value)) {
                isAllRulesFine = false;
                break;
              }
            } else if (type === "lessEqual") {
              if (Number(originalValue) > Number(value)) {
                isAllRulesFine = false;
                break;
              }
            } else {
              throw new Error(`unknown rule type ${type}`);
            }
          }
        }
        if (!isAllRulesFine) {
          continue;
        }

        // parse item to formated item
        const item = new (adapters[sourceType])(
          originalItem,
          siteIdentifier,
        );

        // run init
        await item.init();

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
        index++;
      }
      // if keys length > 1000
      if (currentKeysJson.length > 1000) {
        currentKeysJson = currentKeysJson.slice(0, 1000);
      }
      postTasks.push({
        type: "write",
        meta: {
          path: currentKeysPath,
          content: JSON.stringify(currentKeysJson, null, 2),
        },
      });
      log.info(
        `saved ${total} items from ${sourceUrl} for ${siteIdentifier}`,
      );
    }
  }
  return { postTasks };
}
