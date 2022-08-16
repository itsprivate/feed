import { datetime } from "../deps.ts";
import {
  getArchivedItemsFilePath,
  getCurrentToBeArchivedItemsFilePath,
  getDataCurrentItemsPath,
  readJSONFile,
  writeJSONFile,
} from "../util.ts";
import log from "../log.ts";
import { FormatedItem, RunOptions } from "../interface.ts";

export default async function archive(options: RunOptions) {
  const now = new Date();

  let domains: string[] = [];

  for await (const dirEntry of Deno.readDir(getDataCurrentItemsPath())) {
    if (dirEntry.isDirectory && !dirEntry.name.startsWith(".")) {
      domains.push(dirEntry.name);
    }
  }
  const sites = options.domains;
  if (sites && Array.isArray(sites)) {
    domains = domains.filter((domain) => {
      return (sites as string[]).includes(domain);
    });
  }
  for (const domain of domains) {
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

    //check if need to archive items
    const currentToBeArchivedItemsKeys = Object.keys(
      currentToBeArchivedItemsJson,
    );
    const currentToBeArchivedItemsKeysSorted = currentToBeArchivedItemsKeys
      .sort((a, b) => {
        const aModified = currentToBeArchivedItemsJson[a]["date_modified"]!;
        const bModified = currentToBeArchivedItemsJson[b]["date_modified"]!;
        return new Date(aModified) > new Date(bModified) ? -1 : 1;
      });

    if (currentToBeArchivedItemsKeysSorted.length > 0) {
      // yes check to be archived

      const oldestToBeArchivedItem = currentToBeArchivedItemsJson[
        currentToBeArchivedItemsKeysSorted[
          currentToBeArchivedItemsKeysSorted.length - 1
        ]
      ];
      // if their date_modified is less than current week

      const oldestToBeArchivedItemDate = new Date(
        oldestToBeArchivedItem.date_modified,
      );
      const currentWeek = datetime.weekOfYear(now);

      const currentWeekNumber = now.getUTCFullYear() + currentWeek;
      const WeekNumberOfOldestToBeArchivedItem =
        oldestToBeArchivedItemDate.getUTCFullYear() +
        datetime.weekOfYear(oldestToBeArchivedItemDate);
      if (currentWeekNumber > WeekNumberOfOldestToBeArchivedItem) {
        // archive items
        // from old to new
        const archiedGroups: Record<string, Record<string, unknown>> = {};
        for (
          let i = currentToBeArchivedItemsKeysSorted.length - 1;
          i >= 0;
          i--
        ) {
          const key = currentToBeArchivedItemsKeysSorted[i];
          const item = currentToBeArchivedItemsJson[key];
          // check date_modified
          const itemDate = new Date(item.date_modified);
          const weekOfItem = datetime.weekOfYear(itemDate);
          const weekNumberOfItem = itemDate.getUTCFullYear() + weekOfItem;

          if (weekNumberOfItem < currentWeekNumber) {
            // archived
            const archivedFolder = `${itemDate.getUTCFullYear()}/${weekOfItem}`;
            if (!archiedGroups[archivedFolder]) {
              archiedGroups[archivedFolder] = {};
            }
            archiedGroups[archivedFolder][key] = item;
            delete currentToBeArchivedItemsJson[key];
          }
        }

        // write to be archived items to file
        await writeJSONFile(
          currentToBeArchivedFilePath,
          currentToBeArchivedItemsJson,
        );
        // write archived items to file
        for (const archivedFolder of Object.keys(archiedGroups)) {
          const archivedItemsPath = getArchivedItemsFilePath(
            domain,
            archivedFolder,
          );
          await writeJSONFile(
            archivedItemsPath,
            archiedGroups[archivedFolder],
          );
          log.info(
            `archived ${
              Object.keys(archiedGroups[archivedFolder]).length
            } items to ${archivedItemsPath}`,
          );
        }
        // for garbage collection
        // @ts-ignore: type is not assignable
        currentToBeArchivedItemsJson = null;
      } else {
        // no archive items
        log.info(
          `no need to archive items for ${domain}`,
        );
      }
    } else {
      log.info(
        `skip archived for ${domain}, cause no items to be archived`,
      );
    }
    // latest item date_modified is greater Monday
    // we will run archive task, try to archive all items of their week
  }
}
