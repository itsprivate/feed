import { fs } from "../deps.ts";
import { FormatedItem, RunOptions } from "../interface.ts";
import Item from "../item.ts";
import getLatestItems from "../latest-items.ts";
import {
  arrayToObj,
  domainToPath,
  getArchivedFilePath,
  getCurrentItemsFilePath,
  getCurrentToBeArchivedItemsFilePath,
  getDataTranslatedPath,
  pathToDomain,
  readJSONFile,
  writeJSONFile,
} from "../util.ts";
import log from "../log.ts";

export default async function buildCurrent(
  options: RunOptions,
) {
  // get all 3-translated files
  // is exists translated files folder
  let domains: string[] = [];

  for await (const dirEntry of Deno.readDir(getDataTranslatedPath())) {
    if (dirEntry.isDirectory && !dirEntry.name.startsWith(".")) {
      domains.push(pathToDomain(dirEntry.name));
    }
  }
  const sites = options.domains;
  if (sites && Array.isArray(sites)) {
    domains = domains.filter((domain) => {
      return (sites as string[]).includes(domain);
    });
  }

  for (const domain of domains) {
    const files: string[] = [];
    try {
      for await (
        const entry of fs.walk(
          getDataTranslatedPath() + "/" + domainToPath(domain),
        )
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
      } catch (e) {
        // ignore
        log.debug(`read json file error: ${e}`);
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
      } catch (e) {
        // ignore
        log.debug(`read json file error: ${e}`);
      }

      // merge items to current itemsJson
      const tagFiles: Record<string, Record<string, FormatedItem>> = {};
      for (const item of items) {
        const id = item["id"];
        currentItemsJson[id] = item;
        currentToBeArchivedItemsJson[id] = item;
        // handle tags
        const tags = item["tags"];
        if (tags && Array.isArray(tags) && tags.length > 0) {
          // look for tags
          for (const tag of tags) {
            const tagFilePath = getArchivedFilePath(
              domain,
              // @ts-ignore: npm module
              `tags/${slug(tag)}/items.json`,
            );
            if (tagFiles[tagFilePath]) {
              tagFiles[tagFilePath][id] = item;
            } else {
              let tagFileJson: Record<string, FormatedItem> = {};
              try {
                tagFileJson = await readJSONFile(tagFilePath);
              } catch (e) {
                // ignore
                log.debug(
                  `can not found tag file: ${tagFilePath}, will create ${e}`,
                );
              }
              tagFileJson[id] = item;
              tagFiles[tagFilePath] = tagFileJson;
            }
          }
        }
      }

      // write tagFiles
      const tagFilePaths = Object.keys(tagFiles);
      for (const tagFilePath of tagFilePaths) {
        // only write max 1000 items
        await writeJSONFile(
          tagFilePath,
          arrayToObj(getLatestItems(tagFiles[tagFilePath])),
        );
      }
      // write new current items to file

      await writeJSONFile(
        currentItemsPath,
        arrayToObj(getLatestItems(currentItemsJson)),
      );

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
      const translatedPath = getDataTranslatedPath() + "/" +
        domainToPath(domain);
      await Deno.remove(translatedPath, {
        recursive: true,
      });
    }
  }
}
