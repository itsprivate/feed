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

export default async function buildCurrent(
  options: RunOptions | undefined = {},
) {
  // get all 3-translated files
  // is exists translated files folder
  let domains: string[] = [];

  for await (const dirEntry of Deno.readDir(getDataTranslatedPath())) {
    if (dirEntry.isDirectory && !dirEntry.name.startsWith(".")) {
      domains.push(dirEntry.name);
    }
  }
  const sites = options.sites;
  if (sites && Array.isArray(sites)) {
    domains = domains.filter((domain) => {
      return (sites as string[]).includes(domain);
    });
  }

  for (const domain of domains) {
    const files: string[] = [];
    try {
      for await (
        const entry of fs.walk(getDataTranslatedPath() + "/" + domain)
      ) {
        if (entry.isFile) {
          files.push(entry.path);
        }
      }
    } catch (e) {
      throw e;
    }
    if (files.length > 0) {
      log.info(`get ${files.length} translated items for ${domain}`);
      // move items to current items folder
      // get all json
      // TODO tryGetSiteByFolderPath
      const promises = [];
      for (const file of files) {
        promises.push(
          Deno.readTextFile(file).then((text) => JSON.parse(text)),
        );
      }
      const items = await Promise.all(promises);
      // get current items
      const currentItemsPath = getCurrentItemsFilePath(domain);
      let currentItemsJson: Record<string, FormatedItem> = {};
      try {
        currentItemsJson = await readJSONFile(currentItemsPath);
      } catch (_e) {
        // ignore
      }

      const currentToBeArchivedFilePath = getCurrentToBeArchivedItemsFilePath(
        domain,
      );
      let currentToBeArchivedItemsJson: Record<
        string,
        FormatedItem
      > = {};
      try {
        currentToBeArchivedItemsJson = await readJSONFile(
          currentToBeArchivedFilePath,
        );
      } catch (_e) {
        // ignore
      }

      // merge items to current itemsJson
      for (const item of items) {
        const id = item["id"];
        currentItemsJson[id] = item;
        currentToBeArchivedItemsJson[id] = item;
      }

      // sort current items by date_modified
      // archive over max items
      const currentItemsKeys = Object.keys(currentItemsJson);
      const currentItemsKeysSorted = currentItemsKeys.sort((a, b) => {
        const aModified = currentItemsJson[a]["date_modified"]!;
        const bModified = currentItemsJson[b]["date_modified"]!;
        return new Date(aModified) > new Date(bModified) ? -1 : 1;
      });

      // generate new current items
      const newCurrentItems = currentItemsKeysSorted.slice(
        0,
        MAX_ITEMS_PER_PAGE,
      )
        .reduce(
          (acc, key) => {
            acc[key] = currentItemsJson[key];
            return acc;
          },
          {} as Record<string, unknown>,
        );

      // write new current items to file

      await writeJSONFile(currentItemsPath, newCurrentItems);

      // for garbage collection
      // @ts-ignore: type is not assignable
      currentItemsJson = null;

      // write current to be archived items to file
      await writeJSONFile(
        currentToBeArchivedFilePath,
        currentToBeArchivedItemsJson,
      );
      // for garbage collection
      // @ts-ignore: type is not assignable
      currentToBeArchivedItemsJson = null;

      // delete translated folder
      await Deno.remove(getDataTranslatedPath() + "/" + domain, {
        recursive: true,
      });
    }
  }
}
