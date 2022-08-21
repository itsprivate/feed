import { fs, slug } from "../deps.ts";
import { ItemsJson, RunOptions } from "../interface.ts";
import getLatestItems from "../latest-items.ts";
import {
  arrayToObj,
  getArchivedFilePath,
  getCurrentItemsFilePath,
  getCurrentTagsFilePath,
  getCurrentToBeArchivedItemsFilePath,
  getDataTranslatedPath,
  loadS3ArchiveFile,
  pathToSiteIdentifier,
  readJSONFile,
  siteIdentifierToPath,
  writeJSONFile,
} from "../util.ts";
import log from "../log.ts";

export default async function buildCurrent(
  options: RunOptions,
) {
  // get all 3-translated files
  // is exists translated files folder
  let siteIdentifiers: string[] = [];
  // ensure folder exists
  await fs.ensureDir(getDataTranslatedPath());
  for await (const dirEntry of Deno.readDir(getDataTranslatedPath())) {
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

  for (const siteIdentifier of siteIdentifiers) {
    const files: string[] = [];
    try {
      for await (
        const entry of fs.walk(
          getDataTranslatedPath() + "/" + siteIdentifierToPath(siteIdentifier),
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
      log.info(
        `start build items, got ${files.length} translated items for ${siteIdentifier}`,
      );
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
      const currentItemsPath = getCurrentItemsFilePath(siteIdentifier);
      let currentItemsJson: ItemsJson = {
        items: {},
      };
      try {
        currentItemsJson = await readJSONFile(currentItemsPath);
      } catch (e) {
        // ignore
        log.debug(`read json file error: ${e}`);
      }

      const currentToBeArchivedFilePath = getCurrentToBeArchivedItemsFilePath(
        siteIdentifier,
      );
      let currentToBeArchivedItemsJson: ItemsJson = { items: {} };
      try {
        currentToBeArchivedItemsJson = await readJSONFile(
          currentToBeArchivedFilePath,
        );
      } catch (e) {
        // ignore
        log.debug(`read json file error: ${e}`);
      }

      // merge items to current itemsJson
      const tagFiles: Record<string, ItemsJson> = {};
      for (const item of items) {
        const id = item["id"];
        currentItemsJson.items[id] = item;
        currentToBeArchivedItemsJson.items[id] = item;
        // handle tags
        const tags = item["tags"];
        if (tags && Array.isArray(tags) && tags.length > 0) {
          let currentTags: string[] = [];

          try {
            currentTags = await readJSONFile(
              getCurrentTagsFilePath(siteIdentifier),
            );
          } catch (e) {
            // ignore
            log.debug(`read json file error: ${e}`);
          }
          let isTagsChanged = false;
          // look for tags
          for (const tag of tags) {
            if (!currentTags.includes(tag)) {
              currentTags.unshift(tag);
              isTagsChanged = true;
            } else {
              // move to first
              const index = currentTags.indexOf(tag);
              currentTags.splice(index, 1);
              currentTags.unshift(tag);
              isTagsChanged = true;
            }
            const tagFilePath = getArchivedFilePath(
              siteIdentifier,
              // @ts-ignore: npm module
              `tags/${slug(tag)}/items.json`,
            );
            if (tagFiles[tagFilePath]) {
              tagFiles[tagFilePath].items[id] = item;
            } else {
              let tagFileJson: ItemsJson = {
                meta: {
                  name: tag,
                },
                items: {},
              };
              // load remote tag files
              await loadS3ArchiveFile(tagFilePath);
              try {
                tagFileJson = await readJSONFile(tagFilePath);
              } catch (e) {
                // ignore
                log.debug(
                  `can not found tag file: ${tagFilePath}, will create ${e}`,
                );
              }
              tagFileJson.items[id] = item;
              tagFiles[tagFilePath] = tagFileJson;
            }
          }
          if (isTagsChanged) {
            await writeJSONFile(
              getCurrentTagsFilePath(siteIdentifier),
              currentTags,
            );
          }
        }
      }

      // write tagFiles
      const tagFilePaths = Object.keys(tagFiles);
      for (const tagFilePath of tagFilePaths) {
        // only write max 1000 items
        await writeJSONFile(
          tagFilePath,
          {
            meta: tagFiles[tagFilePath].meta,
            items: arrayToObj(getLatestItems(tagFiles[tagFilePath].items)),
          },
        );
      }
      // write new current items to file

      await writeJSONFile(
        currentItemsPath,
        {
          items: arrayToObj(getLatestItems(currentItemsJson.items)),
        },
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
    }
  }
}
