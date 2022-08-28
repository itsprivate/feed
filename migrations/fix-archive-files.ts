import { contentType, dotenvConfig, fs, path } from "../deps.ts";
import {
  exists,
  getArchivedBucketName,
  getArchivedFilePath,
  getArchivePath,
  getArchiveS3Bucket,
  getCurrentItemsFilePath,
  getDataPath,
  getFullDay,
  getFullMonth,
  getFullYear,
  loadS3ArchiveFile,
  readJSONFile,
  weekOfYear,
  writeJSONFile,
} from "../util.ts";
import { FormatedItem, ItemsJson } from "../interface.ts";
import log from "../log.ts";
export default async function main() {
  // walk current folder
  const regex = /[^0-9]*(\d+?)[^0-9]+/;
  await fs.ensureDir(getArchivePath());

  await fs.ensureDir(getDataPath());
  let totalItems = 0;
  let totalFiles = 0;
  let total = 0;
  for await (const entry of fs.walk(getDataPath())) {
    if (
      entry.isFile &&
      (
        entry.name === "to-be-archived-items.json"
      )
    ) {
      totalFiles++;

      // Set the parameters for the object to upload.
      // TODO
      const parentPath = path.dirname(entry.path);
      const siteIdentifier = path.basename(parentPath);
      const currentItemsPath = getCurrentItemsFilePath(siteIdentifier);
      let archiveItemsCount = 0;
      let currentItemsJson: ItemsJson = {
        items: {},
      };
      try {
        currentItemsJson = await readJSONFile(currentItemsPath);
      } catch (e) {
        // ignore
        log.debug(`read json file error: ${e}`);
      }
      let currentArchive: string[] = currentItemsJson.archive || [];
      const currentTags: string[] = currentItemsJson.tags || [];

      let total = 0;
      // merge items to current itemsJson
      const tagFiles: Record<string, ItemsJson> = {};
      const archiveFiles: Record<string, ItemsJson> = {};

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
      const itemsJson = await readJSONFile(entry.path);
      let isChanged = false;
      if (itemsJson.items) {
        const keys = Object.keys(itemsJson.items);

        if (keys.length > 0) {
          for (const key of keys) {
            const item = itemsJson.items[key];
            total++;
            await archivePost(item);
          }
          isChanged = true;

          if (isChanged) {
            // delete it;
            await Deno.remove(entry.path);
          }

          if (total % 100 === 0) {
            log.info(`Processing ${total} files`);
          }
        }
      }

      // write to archive
      // write archive files
      // write archiveFiles
      const archiveFilePaths = Object.keys(archiveFiles);
      for (const archiveFilePath of archiveFilePaths) {
        await writeJSONFile(
          archiveFilePath,
          archiveFiles[archiveFilePath],
        );
      }
    }
  }
  log.info("total files", totalFiles);
  log.info(
    `fixed data ${total} files `,
  );
}

if (import.meta.main) {
  // init dotenv
  await dotenvConfig({ export: true });
  await main();
}
interface ParsedFilename {
  id: string;
  year: string;
  month: string;
  day: string;
  language: string;
  type: string;
}
function stringifyItemIdentifier(
  parsed: ParsedFilename,
  published: string,
): string {
  const date = new Date(published);
  const year = getFullYear(date);
  const month = getFullMonth(date);
  const day = getFullDay(date);
  return `${parsed.language}_${parsed.type}_${year}_${month}_${day}__${parsed.id}`;
}

function parseItemIdentifier(
  fileBasename: string,
) {
  // remove extension
  let filename = fileBasename;
  if (filename.endsWith(".json")) {
    filename = filename.slice(0, -5);
  }
  const parts = filename.split("__");
  // first will be safe part, other will be the id parts
  const safePart = parts[0];
  const symParts = safePart.split("_");

  if (symParts.length === 2) {
    // olde
    const language = symParts[0];
    const type = symParts[1];

    const idParts = parts.slice(1);
    const id = idParts.join("__");
    return {
      id,
      year: "",
      month: "",
      day: "",
      language,
      type,
    };
  } else {
    const language = symParts[0];
    const type = symParts[1];
    const year = symParts[2];
    const month = symParts[3];
    const day = symParts[4];
    const idParts = parts.slice(1);
    const id = idParts.join("__");
    return {
      id,
      year,
      month,
      day,
      language,
      type,
    };
  }
}
