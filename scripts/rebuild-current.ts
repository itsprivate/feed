import { dotenvConfig, fs, path } from "../deps.ts";
import {
  arrayToObj,
  getArchivedFilePath,
  getArchivePath,
  getCurrentTagsFilePath,
  getCurrentToBeArchivedItemsFilePath,
  getDataCurrentItemsPath,
  getDistPath,
  loadS3ArchiveFile,
  pathToSiteIdentifier,
  readJSONFile,
  resortArchiveKeys,
  slug,
  writeJSONFile,
} from "../util.ts";
import log from "../log.ts";
import { ItemsJson } from "../interface.ts";
import getLatestItems from "../latest-items.ts";

export async function rebuildCurrent() {
  // re add tags from current items
  await fs.ensureDir(getDistPath());
  // ensure folder exists
  const siteIdentifiers: string[] = [];
  for await (const dirEntry of Deno.readDir(getArchivePath())) {
    if (dirEntry.isDirectory && !dirEntry.name.startsWith(".")) {
      siteIdentifiers.push(pathToSiteIdentifier(dirEntry.name));
    }
  }

  for (const siteIdentifier of siteIdentifiers) {
    // first load all tags to
    const tagsFolder = getArchivePath() + "/" + siteIdentifier + "/tags";
    // ensure folder exists
    await fs.ensureDir(tagsFolder);

    let currentTags: string[] = [];
    // walk folder
    for await (const entry of fs.walk(tagsFolder)) {
      if (entry.isFile && entry.name.endsWith(".json")) {
        const itemsJson = await readJSONFile(entry.path);
        if (itemsJson.meta && itemsJson.meta.name) {
          if (!currentTags.includes(itemsJson.meta.name)) {
            currentTags.push(itemsJson.meta.name);
          }
        }
        await writeJSONFile(entry.path, itemsJson);
      }
    }

    // get current issues
    let currentIssues: string[] = [];
    const issuesFolder = getArchivePath() + "/" + siteIdentifier + "/issues";
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

    // get current archive
    let currentArchive: string[] = [];
    const archiveFolder = getArchivePath() + "/" + siteIdentifier + "/archive";
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
    // resort archive

    currentArchive = resortArchiveKeys(currentArchive);

    currentIssues = resortArchiveKeys(currentIssues);

    // console.log("tags", currentTags);
    // console.log("issues", currentIssues);
    // console.log("archive", currentArchive);
    let items = {};
    if (currentArchive.length > 0) {
      const latestArchiveFilePath = getArchivedFilePath(
        siteIdentifier,
        "archive/" + currentArchive[0] + "/items.json",
      );
      const itemsJson = await readJSONFile(latestArchiveFilePath);
      items = itemsJson.items;
    }

    const newItems: ItemsJson = {
      items: items,
      tags: currentTags,
      issues: currentIssues,
      archive: currentArchive,
    };

    // write to current
    const currentFilepath = getDataCurrentItemsPath();
    await writeJSONFile(
      `${currentFilepath}/${siteIdentifier}/items.json`,
      newItems,
    );
  }
}

if (import.meta.main) {
  await rebuildCurrent();
}
