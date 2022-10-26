import { async, fs, path } from "../deps.ts";
import { FormatedItem, ItemsJson, RunOptions } from "../interface.ts";
import getLatestItems from "../latest-items.ts";
import {
  arrayToObj,
  exists,
  getArchivedFilePath,
  getChangedSitePaths,
  getCurrentItemsFilePath,
  getCurrentKeysFilePath,
  getCurrentToBeArchivedItemsFilePath,
  getDataTranslatedPath,
  getFilesByTargetSiteIdentifiers,
  hasSameKeys,
  loadS3ArchiveFile,
  readJSONFile,
  resortArchiveKeys,
  slug,
  weekOfYear,
  writeJSONFile,
} from "../util.ts";
import SourceItem from "../adapters/source.ts";
import log from "../log.ts";
import { MAX_ITEMS_PER_PAGE } from "../constant.ts";

export default async function buildCurrent(
  options: RunOptions,
) {
  // get all 3-translated files
  // is exists translated files folder
  // ensure folder exists
  await fs.ensureDir(getDataTranslatedPath());
  const sites = options.siteIdentifiers || [];
  const { groups, targetSiteIdentifiers } =
    await getFilesByTargetSiteIdentifiers(
      getDataTranslatedPath(),
      sites,
    );
  const filesNeedToBeDeleted = new Set<string>();
  const changedSites: string[] = [];
  for (const siteIdentifier of targetSiteIdentifiers) {
    const files = groups[siteIdentifier] || [];
    const siteConfig = options.config.sites[siteIdentifier];
    if (files.length > 0) {
      log.info(
        `start collect ${siteIdentifier} current items, got ${files.length} translated items`,
      );

      // move items to current items folder
      // get all json
      // get current items
      const currentItemsPath = getCurrentItemsFilePath(siteIdentifier);
      const currentKeysPath = getCurrentKeysFilePath(siteIdentifier);
      let currentItemsJson: ItemsJson = {
        items: {},
      };
      try {
        currentItemsJson = await readJSONFile(currentItemsPath) as ItemsJson;
      } catch (e) {
        // ignore
        log.debug(`read json file error: ${e}`);
      }

      let currentKeyssJson: string[] = [];
      try {
        currentKeyssJson = await readJSONFile(currentKeysPath) as string[];
      } catch (e) {
        // ignore
        log.debug(`read keys json file error: ${e}`);
      }
      let currentArchive: string[] = currentItemsJson.archive || [];
      const currentTags: string[] = currentItemsJson.tags || [];

      let total = 0;
      // merge items to current itemsJson
      const tagFiles: Record<string, ItemsJson> = {};
      const archiveFiles: Record<string, ItemsJson> = {};

      let archiveItemsCount = 0;
      const newTagItemsCountMap: Record<string, number> = {};
      let isTagsChanged = false;
      const archivePost = async (item: FormatedItem) => {
        // start archive
        const itemDate = new Date(item.date_published);
        const weekOfItem = weekOfYear(itemDate);
        const archivedFolder = weekOfItem.path;
        const archiveFilePath = getArchivedFilePath(
          siteIdentifier,
          `archive/${archivedFolder}/items.json`,
        );
        if (archiveFiles[archiveFilePath]) {
          archiveFiles[archiveFilePath].items[item.id] = item;
        } else {
          let archiveFileJson: ItemsJson = { items: {} };

          // load remote tag files
          const isArchiveFileExists = await exists(archiveFilePath);
          if (!isArchiveFileExists) {
            // try to get current archived file, merge them
            // load remote tag files
            try {
              await loadS3ArchiveFile(archiveFilePath);
            } catch (e) {
              log.error(`load remote archive file error: ${archiveFilePath}`);
              throw e;
            }
          }

          try {
            archiveFileJson = await readJSONFile(archiveFilePath);
          } catch (e) {
            // ignore
            log.debug(
              `can not found tag file: ${archiveFilePath}, will create ${e}`,
            );
          }
          archiveFileJson.items[item.id] = item;
          archiveFiles[archiveFilePath] = archiveFileJson;
        }

        if (!currentArchive.includes(archivedFolder)) {
          currentArchive.unshift(archivedFolder);
        }
        log.debug(
          `archived ${item.id} to ${archivedFolder}, total: ${
            Object.keys(archiveFiles[archiveFilePath].items).length
          } items `,
        );
        archiveItemsCount++;
        if (archiveItemsCount % 100 === 0) {
          log.info(`archived ${archiveItemsCount} items`);
        }
      };
      const tagPost = async (tag: string, item: FormatedItem) => {
        const tagFilePath = getArchivedFilePath(
          siteIdentifier,
          // @ts-ignore: npm module
          `tags/${slug(tag)}/items.json`,
        );
        if (tagFiles[tagFilePath]) {
          tagFiles[tagFilePath].items[item.id] = item;
        } else {
          let tagFileJson: ItemsJson = {
            meta: {
              name: tag,
            },
            items: {},
          };

          // load remote tag files
          const isTagFileExists = await exists(tagFilePath);
          if (!isTagFileExists) {
            // try to get current tagd file, merge them
            // load remote tag files
            try {
              await loadS3ArchiveFile(tagFilePath);
            } catch (e) {
              log.error(`load s3 archive file error: ${tagFilePath}`);
              throw e;
            }
          }

          try {
            tagFileJson = await readJSONFile(tagFilePath);
          } catch (e) {
            // ignore
            log.debug(
              `can not found tag file: ${tagFilePath}, will create ${e}`,
            );
          }
          tagFileJson.items[item.id] = item;
          tagFiles[tagFilePath] = tagFileJson;
        }
      };

      const currentKeysMap = new Map<string, boolean>();
      const itemsKeys = Object.keys(currentItemsJson.items);
      itemsKeys.forEach((key) => {
        const itemInstance = new SourceItem(currentItemsJson.items[key]);
        const cachedKeys = itemInstance.getCachedKeys();
        cachedKeys.forEach((key) => {
          currentKeysMap.set(key, true);
        });
      });
      for (const file of files) {
        const item = await readJSONFile(file) as FormatedItem;
        const id = item["id"];

        // handle tags
        const tags = item["tags"];
        total++;
        if (total % 100 === 0) {
          log.info(`processed ${total} items`);
        }

        // check current items cahced keys, delete duplicated items by urls
        // cause some site, they have different id, but the same urls, we thought that is duplicated.
        const itemInstance = new SourceItem(item);
        const duplicatedKeys = hasSameKeys(
          currentKeysMap,
          itemInstance.getCachedKeys(),
        );
        if (duplicatedKeys.length > 0) {
          log.info(`${item.url} is duplicated, will drop it.`);
          filesNeedToBeDeleted.add(file);
          continue;
        }
        // write to keys
        //
        itemInstance.getCachedKeys().forEach((key) => {
          if (!currentKeyssJson.includes(key)) {
            currentKeyssJson.unshift(key);
          }
        });
        // only add first 500 items to archive list
        if (total <= MAX_ITEMS_PER_PAGE) {
          currentItemsJson.items[id] = item;
          if (siteConfig.archive !== false) {
            await archivePost(item);
          }
        } else {
          // other direct move to archive

          if (siteConfig.archive !== false) {
            // move to archive
            await archivePost(item);
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
              await tagPost(tag, item);
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
        // note: old file may use by other site, so we can not delete it now
        // just put it to set of files to be deleted
        filesNeedToBeDeleted.add(file);
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

      // write archive files
      // write archiveFiles
      const archiveFilePaths = Object.keys(archiveFiles);
      for (const archiveFilePath of archiveFilePaths) {
        await writeJSONFile(
          archiveFilePath,
          archiveFiles[archiveFilePath],
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

      // write curernt keys json
      //
      //
      await writeJSONFile(currentKeysPath, currentKeyssJson.slice(0, 5000));

      // for garbage collection
      // @ts-ignore: type is not assignable
      currentItemsJson = null;
    }
    changedSites.push(siteIdentifier);

    // copy current items to current-changed
  }
  if (changedSites.length > 0) {
    const allEnvValue = Deno.env.get("ALL");
    if (allEnvValue === "1") {
      // ignore write changed sites
    } else {
      // clean changed sites json
      // try {
      //   await Deno.remove(getChangedSitePaths());
      //   log.debug(`clean changed sites json file ` + getChangedSitePaths());
      // } catch (_e) {
      //   // ignore
      // }
      await writeJSONFile(
        getChangedSitePaths(),
        changedSites,
      );
    }
  }
  // delete old files
  for (const file of filesNeedToBeDeleted) {
    await Deno.remove(file);
  }
}
