import { dotenvConfig, fs } from "../deps.ts";
import {
  arrayToObj,
  getArchivedFilePath,
  getCurrentToBeArchivedItemsFilePath,
  getDistPath,
  loadS3ArchiveFile,
  pathToSiteIdentifier,
  readJSONFile,
  slug,
  writeJSONFile,
} from "../util.ts";
import log from "../log.ts";
import { ItemsJson } from "../interface.ts";
import getLatestItems from "../latest-items.ts";

export default async function fixTags() {
  // re add tags from current items
  await fs.ensureDir(getDistPath());
  // ensure folder exists
  const siteIdentifiers: string[] = [];
  for await (const dirEntry of Deno.readDir(getDistPath())) {
    if (dirEntry.isDirectory && !dirEntry.name.startsWith(".")) {
      siteIdentifiers.push(pathToSiteIdentifier(dirEntry.name));
    }
  }

  for (const siteIdentifier of siteIdentifiers) {
    let currentTags: string[] = [];

    try {
      // currentTags = await readJSONFile(
      //   getCurrentTagsFilePath(siteIdentifier),
      // );
    } catch (e) {
      // ignore
      log.debug(`read json file error: ${e}`);
    }
    let total = 0;
    // merge items to current itemsJson
    const tagFiles: Record<string, ItemsJson> = {};

    // read to-be-archived-items
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
    let isTagsChanged = false;
    for (const itemKey of Object.keys(currentToBeArchivedItemsJson.items)) {
      const item = currentToBeArchivedItemsJson.items[itemKey];
      const tags = item.tags;
      const id = item.id;
      if (tags && Array.isArray(tags) && tags.length > 0) {
        total++;
        isTagsChanged = true;
        // look for tags
        for (const tag of tags) {
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
    }

    // write tagFiles
    const tagFilePaths = Object.keys(tagFiles);
    for (const tagFilePath of tagFilePaths) {
      log.info(`write tag file: ${tagFilePath}`);
      await writeJSONFile(
        tagFilePath,
        {
          meta: tagFiles[tagFilePath].meta,
          items: arrayToObj(
            getLatestItems(tagFiles[tagFilePath].items),
          ),
        },
      );
    }
    // write tag index
    if (isTagsChanged) {
      // log.info(`write tags file: ${getCurrentTagsFilePath(siteIdentifier)}`);
      // await writeJSONFile(
      //   getCurrentTagsFilePath(siteIdentifier),
      //   currentTags,
      // );
    }
  }
}

if (import.meta.main) {
  await dotenvConfig({
    export: true,
  });
  await fixTags();
}
