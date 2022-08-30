import { fs, path } from "../deps.ts";
import {
  arrayToObj,
  getDataCurrentItemsPath,
  getDevDataCurrentItemsPath,
  getDistPath,
  getProdArchivePath,
  pathToSiteIdentifier,
  readJSONFile,
  resortArchiveKeys,
  writeJSONFile,
} from "../util.ts";
import log from "../log.ts";
import { MAX_ITEMS_PER_PAGE } from "../constant.ts";
import { FormatedItem, ItemsJson } from "../interface.ts";
import getLatestItems from "../latest-items.ts";

export async function rebuildCurrent() {
  // re add tags from current items
  await fs.ensureDir(getDistPath());
  // ensure folder exists
  const siteIdentifiers: string[] = [];
  for await (const dirEntry of Deno.readDir(getProdArchivePath())) {
    if (dirEntry.isDirectory && !dirEntry.name.startsWith(".")) {
      siteIdentifiers.push(pathToSiteIdentifier(dirEntry.name));
    }
  }

  for (const siteIdentifier of siteIdentifiers) {
    // first load all tags to
    const tagsFolder = getProdArchivePath() + "/" + siteIdentifier + "/tags";
    // ensure folder exists
    await fs.ensureDir(tagsFolder);

    const currentTags: string[] = [];
    // walk folder
    for await (const entry of fs.walk(tagsFolder)) {
      if (entry.isFile && entry.name.endsWith(".json")) {
        const itemsJson = await readJSONFile(entry.path);
        if (itemsJson.meta && itemsJson.meta.name) {
          if (!currentTags.includes(itemsJson.meta.name)) {
            currentTags.push(itemsJson.meta.name);
          }
        }
      }
    }
    log.info(`Found ${currentTags.length} tags for ${siteIdentifier}`);

    // get current issues
    let currentIssues: string[] = [];
    const issuesFolder = path.join(
      getProdArchivePath(),
      siteIdentifier,
      "issues",
    );
    // ensure folder exists
    await fs.ensureDir(issuesFolder);
    for await (const entry of fs.walk(issuesFolder)) {
      if (entry.isFile && entry.name.endsWith(".json")) {
        const issueDirname = path.dirname(entry.path);
        const week = path.basename(issueDirname);
        const issueDDirname = path.dirname(issueDirname);
        const year = path.basename(issueDDirname);
        const issueKey = year + "/" + week;
        if (!currentIssues.includes(issueKey)) {
          currentIssues.push(issueKey);
        }
      }
    }
    log.info(`Found ${currentIssues.length} issues for ${siteIdentifier}`);

    // get current archive
    let currentArchive: string[] = [];
    const archiveFolder = path.join(
      getProdArchivePath(),
      siteIdentifier,
      "archive",
    );
    // ensure folder exists
    await fs.ensureDir(archiveFolder);
    for await (const entry of fs.walk(archiveFolder)) {
      if (entry.isFile && entry.name.endsWith(".json")) {
        const issueDirname = path.dirname(entry.path);
        const week = path.basename(issueDirname);
        const issueDDirname = path.dirname(issueDirname);
        const year = path.basename(issueDDirname);
        const issueKey = year + "/" + week;
        if (!currentArchive.includes(issueKey)) {
          currentArchive.push(issueKey);
        }
      }
    }
    log.info(
      `Found ${currentArchive.length} archive items for ${siteIdentifier}`,
    );
    // resort archive

    currentArchive = resortArchiveKeys(currentArchive);

    currentIssues = resortArchiveKeys(currentIssues);

    let items: Record<string, FormatedItem> = {};
    if (currentArchive.length > 0) {
      // get latest items
      for (let i = 0; i < currentArchive.length; i++) {
        if (Object.keys(items).length >= MAX_ITEMS_PER_PAGE) {
          break;
        }

        const latestArchiveFilePath = path.join(
          getProdArchivePath(),
          siteIdentifier,
          "archive",
          currentArchive[i],
          "items.json",
        );
        const itemsJson = await readJSONFile(latestArchiveFilePath);
        items = { ...items, ...itemsJson.items };
      }
    }
    const finalItems = arrayToObj(getLatestItems(items));
    log.info(
      `Found ${Object.keys(finalItems).length} items for ${siteIdentifier}`,
    );
    const newItems: ItemsJson = {
      items: finalItems,
      tags: currentTags,
      issues: currentIssues,
      archive: currentArchive,
    };

    // write to current
    let currentFilepath = getDataCurrentItemsPath();
    if (Deno.env.get("TODEV") === "1") {
      currentFilepath = getDevDataCurrentItemsPath();
    }
    await writeJSONFile(
      path.join(currentFilepath, siteIdentifier, "items.json"),
      newItems,
    );
    log.info(`Wrote ${siteIdentifier} items.json success`);
  }
}

if (import.meta.main) {
  await rebuildCurrent();
}
