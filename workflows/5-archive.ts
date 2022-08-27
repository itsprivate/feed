import { fs } from "../deps.ts";
import {
  getArchivedFilePath,
  getChangedSitePaths,
  getCurrentItemsFilePath,
  getCurrentToBeArchivedItemsFilePath,
  getDataCurrentItemsPath,
  isDev,
  isWeekBiggerThan,
  loadS3ArchiveFile,
  pathToSiteIdentifier,
  readJSONFile,
  resortArchiveKeys,
  weekOfYear,
  writeJSONFile,
} from "../util.ts";
import log from "../log.ts";
import { ItemsJson, RunOptions } from "../interface.ts";

export default async function archive(options: RunOptions) {
  const now = new Date();

  let siteIdentifiers: string[] = [];
  // ensure folder exists
  await fs.ensureDir(getDataCurrentItemsPath());
  let changedSites: string[] | undefined;
  try {
    const changedSitesPath = getChangedSitePaths();
    changedSites = await readJSONFile(changedSitesPath);
  } catch (e) {
    log.debug(`read changedSitesPath json file error:`, e);
  }
  if (!changedSites || isDev()) {
    log.info(`no changed sites file, scan all sites`);
    for await (const dirEntry of Deno.readDir(getDataCurrentItemsPath())) {
      if (dirEntry.isDirectory && !dirEntry.name.startsWith(".")) {
        siteIdentifiers.push(pathToSiteIdentifier(dirEntry.name));
      }
    }
  } else {
    log.info(`got changed sites: ${changedSites}`);
    siteIdentifiers = changedSites;
  }

  const sites = options.siteIdentifiers;
  if (sites && Array.isArray(sites)) {
    siteIdentifiers = siteIdentifiers.filter((siteIdentifier) => {
      return (sites as string[]).includes(siteIdentifier);
    });
  }

  for (const siteIdentifier of siteIdentifiers) {
    const siteConfig = options.config.sites[siteIdentifier];
    if (siteConfig.archive === false) {
      log.info(
        `${siteIdentifier}: skip archive as it is configured not archived`,
      );
      continue;
    }
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

      if (isWeekBiggerThan(now, oldestToBeArchivedItemDate)) {
        let currentItems: ItemsJson = { items: {} };
        try {
          currentItems = await readJSONFile(
            getCurrentItemsFilePath(siteIdentifier),
          );
        } catch (e) {
          // ignore
          log.debug(`read json file error: ${e}`);
        }
        let currentArchive = currentItems.archive || [];

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
          const weekOfItem = weekOfYear(itemDate);
          if (isWeekBiggerThan(now, itemDate)) {
            // archived
            const archivedFolder = weekOfItem.path;
            const archiveFilePath = getArchivedFilePath(
              siteIdentifier,
              // @ts-ignore: npm module
              `archive/${archivedFolder}/items.json`,
            );

            if (!archiedGroups[archivedFolder]) {
              archiedGroups[archivedFolder] = {};
              // try to get current archived file, merge them
              // load remote tag files
              await loadS3ArchiveFile(archiveFilePath);
              try {
                const result = await readJSONFile(
                  archiveFilePath,
                );
                archiedGroups[archivedFolder] = result.items;
              } catch (e) {
                // ignore
                log.debug(
                  `can not found tag file: ${archiveFilePath}, will create ${e}`,
                );
              }
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

        // generated issue items, try to get newer data to calculate more accurate data
        // TODO
        for (const archivedFolder of Object.keys(archiedGroups)) {
          const archivedItemsPath = getArchivedFilePath(
            siteIdentifier,
            `archive/${archivedFolder}/items.json`,
          );
          await writeJSONFile(
            archivedItemsPath,
            {
              items: archiedGroups[archivedFolder],
            },
          );
          if (!currentArchive.includes(archivedFolder)) {
            currentArchive.unshift(archivedFolder);
          }
          log.info(
            `archived ${
              Object.keys(archiedGroups[archivedFolder]).length
            } items to ${archivedItemsPath}`,
          );
        }
        currentArchive = resortArchiveKeys(currentArchive);
        currentItems.archive = currentArchive;
        // write to current items file
        await writeJSONFile(
          getCurrentItemsFilePath(siteIdentifier),
          currentItems,
        );
        // for garbage collection
        // @ts-ignore: type is not assignable
        currentToBeArchivedItemsJson = null;
      } else {
        // no archive items
        log.info(
          `${siteIdentifier}: no need to archive items`,
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
