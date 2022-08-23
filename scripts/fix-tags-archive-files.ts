import { dotenvConfig, fs } from "../deps.ts";
import {
  arrayToObj,
  getArchivedFilePath,
  getCurrentArchiveFilePath,
  getCurrentIssuesFilePath,
  getCurrentItemsFilePath,
  getCurrentTagsFilePath,
  getCurrentToBeArchivedItemsFilePath,
  getDataCurrentItemsPath,
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
  for await (const dirEntry of Deno.readDir(getDataCurrentItemsPath())) {
    if (dirEntry.isDirectory && !dirEntry.name.startsWith(".")) {
      siteIdentifiers.push(pathToSiteIdentifier(dirEntry.name));
    }
  }

  for (const siteIdentifier of siteIdentifiers) {
    let currentTags: string[] = [];

    try {
      currentTags = await readJSONFile(
        getCurrentTagsFilePath(siteIdentifier),
      );
    } catch (e) {
      // ignore
      log.debug(`read json file error: ${e}`);
    }
    let currentArchive: string[] = [];
    try {
      currentArchive = await readJSONFile(
        getCurrentArchiveFilePath(siteIdentifier),
      );
    } catch (e) {
      // ignore
      log.debug(`read json file error: ${e}`);
    }

    let currentIssues: string[] = [];
    try {
      currentIssues = await readJSONFile(
        getCurrentIssuesFilePath(siteIdentifier),
      );
    } catch (e) {
      // ignore
      log.debug(`read json file error: ${e}`);
    }
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
    if (currentTags.length > 0) {
      currentItemsJson.tags = currentTags;
    }
    if (currentArchive.length > 0) {
      currentItemsJson.archive = currentArchive;
    }
    if (currentIssues.length > 0) {
      currentItemsJson.issues = currentIssues;
    }
    // write current items
    await writeJSONFile(currentItemsPath, currentItemsJson);
    // remove tags;
    try {
      await Deno.remove(getCurrentTagsFilePath(siteIdentifier));
      await Deno.remove(getCurrentArchiveFilePath(siteIdentifier));
      await Deno.remove(getCurrentIssuesFilePath(siteIdentifier));
    } catch (_e) {
      // ignore
    }
  }
}

if (import.meta.main) {
  await dotenvConfig({
    export: true,
  });
  await fixTags();
}
