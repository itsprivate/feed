import { fs } from "../deps.ts";
import { FormatedItem, ItemsJson, RunOptions } from "../interface.ts";
import getLatestItems from "../latest-items.ts";
import {
  arrayToObj,
  getArchivedFilePath,
  getCurrentItemsFilePath,
  getCurrentToBeArchivedItemsFilePath,
  getDataTranslatedPath,
  isDev,
  loadS3ArchiveFile,
  pathToSiteIdentifier,
  readJSONFile,
  resortArchiveKeys,
  siteIdentifierToPath,
  slug,
  weekOfYear,
  writeJSONFile,
} from "../util.ts";
import log from "../log.ts";
import { MAX_ITEMS_PER_PAGE } from "../constant.ts";

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
    const siteConfig = options.config.sites[siteIdentifier];
    const files: string[] = [];
    try {
      for await (
        const entry of fs.walk(
          getDataTranslatedPath() + "/" + siteIdentifierToPath(siteIdentifier),
        )
      ) {
        if (entry.isFile && entry.path.endsWith(".json")) {
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

      let currentArchive: string[] = currentItemsJson.archive || [];
      let currentTags: string[] = currentItemsJson.tags || [];

      let total = 0;
      // merge items to current itemsJson
      const tagFiles: Record<string, ItemsJson> = {};
      let archiveItemsCount = 0;
      const newTagItemsCountMap: Record<string, number> = {};
      let isTagsChanged = false;

      for (const file of files) {
        const item = await readJSONFile(file) as FormatedItem;
        const id = item["id"];
        // handle tags
        const tags = item["tags"];
        total++;
        if (total % 100 === 0) {
          log.info(`processed ${total} items`);
        }
        // only add first 500 items to archive list
        if (total <= MAX_ITEMS_PER_PAGE) {
          currentItemsJson.items[id] = item;
          if (siteConfig.archive !== false) {
            currentToBeArchivedItemsJson.items[id] = item;
          }
        } else {
          // other direct move to archive

          if (siteConfig.archive !== false) {
            // move to archive
            const itemDate = new Date(item.date_published);
            const weekOfItem = weekOfYear(itemDate);
            const archivedFolder = weekOfItem.path;
            const archiveFilePath = getArchivedFilePath(
              siteIdentifier,
              `archive/${archivedFolder}/items.json`,
            );
            let archiveFileJson: ItemsJson = { items: {} };
            // check is archiveFilePath exits

            const isArchiveFileExists = await exists(archiveFilePath);
            if (!isArchiveFileExists) {
              // try to get current archived file, merge them
              // load remote tag files
              await loadS3ArchiveFile(archiveFilePath);
            }
            try {
              archiveFileJson = await readJSONFile(archiveFilePath);
            } catch (e) {
              // ignore
              log.debug(
                `can not found tag file: ${archiveFilePath}, will create ${e}`,
              );
            }
            archiveFileJson.items[id] = item;
            if (!currentArchive.includes(archivedFolder)) {
              currentArchive.unshift(archivedFolder);
            }
            log.debug(
              `archived ${
                Object.keys(archiveFileJson.items).length
              } items to ${archivedFolder}`,
            );
            archiveItemsCount++;
            if (archiveItemsCount % 100 === 0) {
              log.info(`archived ${archiveItemsCount} items`);
            }
            await writeJSONFile(
              archiveFilePath,
              archiveFileJson,
            );
          }
        }
        if (tags && Array.isArray(tags) && tags.length > 0) {
          isTagsChanged = true;
          // look for tags
          for (const tag of tags) {
            if (!newTagItemsCountMap[tag]) {
              newTagItemsCountMap[tag] = 1;
            } else {
              newTagItemsCountMap[tag] += 1;
            }
            if (newTagItemsCountMap[tag] <= MAX_ITEMS_PER_PAGE) {
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
          }
        }
        // delete old file
        if (!isDev()) {
          await Deno.remove(file);
        }
      }
      if (isTagsChanged) {
        currentItemsJson.tags = currentTags;
      }
      if (siteConfig.archive !== false) {
        // write currentArchive file
        // resort currentArchive by time
        currentArchive = resortArchiveKeys(currentArchive);
        currentItemsJson.archive = currentArchive;
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
          ...currentItemsJson,
          items: arrayToObj(getLatestItems(currentItemsJson.items)),
        },
      );

      // for garbage collection
      // @ts-ignore: type is not assignable
      currentItemsJson = null;

      if (siteConfig.archive !== false) {
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
}
const exists = async (filename: string): Promise<boolean> => {
  try {
    await Deno.stat(filename);
    // successful, file or directory must exist
    return true;
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      // file or directory does not exist
      return false;
    } else {
      // unexpected error, maybe permissions, pass it along
      throw error;
    }
  }
};
