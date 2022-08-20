import { datetime, fs } from "../deps.ts";
import {
  getArchivedFilePath,
  getCurrentArchiveFilePath,
  getCurrentToBeArchivedItemsFilePath,
  getDataCurrentItemsPath,
  pathToSiteIdentifier,
  readJSONFile,
  writeJSONFile,
} from "../util.ts";
import log from "../log.ts";
import { ItemsJson, RunOptions } from "../interface.ts";

export default async function archive(options: RunOptions) {
  const now = new Date();

  let siteIdentifiers: string[] = [];
  // ensure folder exists
  await fs.ensureDir(getDataCurrentItemsPath());

  for await (const dirEntry of Deno.readDir(getDataCurrentItemsPath())) {
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
    const currentToBeArchivedFilePath = getCurrentToBeArchivedItemsFilePath(
      siteIdentifier,
    );
    let currentToBeArchivedItemsJson: ItemsJson = { items: {} };
    try {
      currentToBeArchivedItemsJson = await readJSONFile(
        currentToBeArchivedFilePath,
      );
    } catch (_e) {
      // ignore
    }

    //check if need to archive items
    const currentToBeArchivedItemsKeys = Object.keys(
      currentToBeArchivedItemsJson.items,
    );
    const currentToBeArchivedItemsKeysSorted = currentToBeArchivedItemsKeys
      .sort((a, b) => {
        const aModified = currentToBeArchivedItemsJson
          .items[a]["date_published"]!;
        const bModified = currentToBeArchivedItemsJson
          .items[b]["date_published"]!;
        return new Date(aModified) > new Date(bModified) ? -1 : 1;
      });

    if (currentToBeArchivedItemsKeysSorted.length > 0) {
      // yes check to be archived

      const oldestToBeArchivedItem = currentToBeArchivedItemsJson.items[
        currentToBeArchivedItemsKeysSorted[
          currentToBeArchivedItemsKeysSorted.length - 1
        ]
      ];
      // if their date_published is less than current week

      const oldestToBeArchivedItemDate = new Date(
        oldestToBeArchivedItem.date_published,
      );
      const currentWeek = datetime.weekOfYear(now);

      const currentWeekNumber = now.getUTCFullYear() + currentWeek;
      const WeekNumberOfOldestToBeArchivedItem =
        oldestToBeArchivedItemDate.getUTCFullYear() +
        datetime.weekOfYear(oldestToBeArchivedItemDate);
      if (currentWeekNumber > WeekNumberOfOldestToBeArchivedItem) {
        let currentArchive: string[] = [];
        try {
          currentArchive = await readJSONFile(
            getCurrentArchiveFilePath(siteIdentifier),
          );
        } catch (e) {
          // ignore
          log.debug(`read json file error: ${e}`);
        }

        // archive items
        // from old to new
        const archiedGroups: Record<string, Record<string, unknown>> = {};
        for (
          let i = currentToBeArchivedItemsKeysSorted.length - 1;
          i >= 0;
          i--
        ) {
          const key = currentToBeArchivedItemsKeysSorted[i];
          const item = currentToBeArchivedItemsJson.items[key];
          // check date_published
          const itemDate = new Date(item.date_published);
          const weekOfItem = datetime.weekOfYear(itemDate);
          const weekNumberOfItem = itemDate.getUTCFullYear() + weekOfItem;

          if (weekNumberOfItem < currentWeekNumber) {
            // archived
            const archivedFolder = `${itemDate.getUTCFullYear()}/${weekOfItem}`;
            if (!archiedGroups[archivedFolder]) {
              archiedGroups[archivedFolder] = {};
            }
            archiedGroups[archivedFolder][key] = item;
            delete currentToBeArchivedItemsJson.items[key];
          }
        }

        // write to be archived items to file
        await writeJSONFile(
          currentToBeArchivedFilePath,
          currentToBeArchivedItemsJson,
        );
        // write archived items to file
        for (const archivedFolder of Object.keys(archiedGroups)) {
          const archivedItemsPath = getArchivedFilePath(
            siteIdentifier,
            `archive/${archivedFolder}/items.json`,
          );
          await writeJSONFile(
            archivedItemsPath,
            archiedGroups[archivedFolder],
          );
          currentArchive.unshift(archivedFolder);
          log.info(
            `archived ${
              Object.keys(archiedGroups[archivedFolder]).length
            } items to ${archivedItemsPath}`,
          );
        }
        // write to current archive file
        await writeJSONFile(
          getCurrentArchiveFilePath(siteIdentifier),
          currentArchive,
        );
        // for garbage collection
        // @ts-ignore: type is not assignable
        currentToBeArchivedItemsJson = null;
      } else {
        // no archive items
        log.info(
          `no need to archive items for ${siteIdentifier}`,
        );
      }
    } else {
      log.info(
        `skip archived for ${siteIdentifier}, cause no items to be archived`,
      );
    }
    // latest item date_published is greater Monday
    // we will run archive task, try to archive all items of their week
  }
}
