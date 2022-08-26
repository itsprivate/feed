import { fs } from "../deps.ts";
import {
  getArchivedFilePath,
  getArchivePath,
  getCurrentItemsFilePath,
  getFullMonth,
  getFullYear,
  getMigratedIssueMapPath,
  isDev,
  parseItemIdentifier,
  readJSONFile,
  resortArchiveKeys,
  weekOfYear,
  writeJSONFile,
} from "../util.ts";
import log from "../log.ts";
import { DEV_MODE_HANDLED_ITEMS } from "../constant.ts";
import { FormatedItem, ItemsJson } from "../interface.ts";
export default async function moveIssues() {
  // get all 1-raw files
  // is exists raw files folder
  const siteIdentifier = "hn";
  const files: string[] = [];
  let issues: string[] = [];
  let oldAndNewMap: Record<string, Record<string, string>> = {};
  try {
    oldAndNewMap = await readJSONFile(getMigratedIssueMapPath());
  } catch (_e) {
    // ignore
  }
  if (!oldAndNewMap[siteIdentifier]) {
    oldAndNewMap[siteIdentifier] = {};
  }
  try {
    let totalFiles = 0;
    for await (
      const entry of fs.walk(
        "../inbox/ts-new/data/hn-top-issues",
      )
    ) {
      if (isDev()) {
        if (totalFiles >= 1) {
          log.info(`dev mode, only take ${DEV_MODE_HANDLED_ITEMS} files`);
          break;
        }
      }
      if (entry.isFile && entry.path.endsWith(".json")) {
        files.push(entry.path);
        totalFiles += 1;
      }
    }
  } catch (e) {
    throw e;
  }
  let total = 0;
  let totalItems = 0;
  if (files.length > 0) {
    // build all items map
    const itemsMap: Record<string, string> = {};
    let archiveTotal = 0;
    for await (
      const entry of fs.walk(getArchivedFilePath(siteIdentifier, "archive"))
    ) {
      if (entry.isFile && entry.path.endsWith(".json")) {
        // if (isDev()) {
        //   if (archiveTotal >= 3) {
        //     log.info(`dev mode, only take ${DEV_MODE_HANDLED_ITEMS} files`);
        //     break;
        //   }
        // }
        const json = await readJSONFile(entry.path);
        const keys = Object.keys(json.items);
        for (const key of keys) {
          itemsMap[newIdToSlug(key)] = entry.path;
        }
        archiveTotal++;
      }
    }
    // console.log("itemsMap", itemsMap);
    for (const file of files) {
      // if total can divide by 100
      if (total % 100 === 0) {
        log.info(`handled: ${total}`);
      }
      const originalItem = await readJSONFile(file) as OldIssue;
      const newItems: ItemsJson = { items: {} };
      const items = originalItem.items;
      for (const item of items) {
        // console.log("item", item);
        const id = item.slug;
        // try to find new file path
        const newPath = itemsMap[id];
        if (newPath) {
          // console.log("yes, found", newPath);
          try {
            const newJson = await readJSONFile(newPath) as ItemsJson;

            const newJsonItems = newJson.items;
            const newKeys = Object.keys(newJsonItems);
            const oldItemsMap: Record<string, FormatedItem> = {};
            for (const key of newKeys) {
              const oldSlug = newIdToSlug(key);
              oldItemsMap[oldSlug] = newJsonItems[key];
            }
            if (oldItemsMap[id]) {
              const newItem = oldItemsMap[id];
              totalItems++;
              newItems.items[newItem.id] = newItem;
            } else {
              log.info(`${id} not match `);
              throw new Error(`${id} not match `);
            }
          } catch (e) {
            log.warn("error when format item", e);
            throw e;
          }
        } else {
          log.warn(`can not find new path for ${id}`);
        }
      }
      const weekInfo = weekOfYear(new Date(originalItem.startedAt));
      // write to issue files
      const issuePath =
        `${getArchivePath()}/${siteIdentifier}/issues/${weekInfo.path}/items.json`;
      await writeJSONFile(issuePath, newItems);
      issues.push(weekInfo.path);

      oldAndNewMap[siteIdentifier][originalItem.issueNumber] = weekInfo.path;
      // write to issue index

      total++;
    }
  }

  const currentItemsPath = getCurrentItemsFilePath(siteIdentifier);
  issues = resortArchiveKeys(issues);
  await writeJSONFile(getMigratedIssueMapPath(), oldAndNewMap);

  // try read current items
  let currentItems: ItemsJson = { items: {} };
  try {
    currentItems = await readJSONFile(currentItemsPath) as ItemsJson;
  } catch (e) {
    // ignore
  }
  // merge current items and new items
  currentItems.issues = issues;

  await writeJSONFile(currentItemsPath, currentItems);
  log.info(
    `formated ${total} issues, ${totalItems} items`,
  );
}

function slugToId() {
}

function newIdToSlug(newId: string) {
  const parsed = parseItemIdentifier(newId);
  let type = parsed.type;
  if (parsed.type === "twitter") {
    type = "tweet";
  }
  let id = parsed.id;
  if (parsed.type === "reddit") {
    id = id.replace(/--/g, "/");
  }
  return `/${type}/${id}/`;
}

function getId(permalink: string): string {
  const id = permalink;
  // replace / to -- to avoid conflict with path
  return id.slice(1, -1).replace(/\//g, "--");
}
export interface OldIssue {
  createdAt: number;
  updatedAt: number;
  startedAt: number;
  endedAt: number;
  id: string;
  issueNumber: number;
  year: number;
  items: Item[];
  draft: boolean;
  localize: any[];
}

export interface Item {
  slug: string;
  createdAt: number;
  score: number;
  type: Type;
}

export enum Type {
  Reddit = "stocks",
}
if (import.meta.main) {
  await moveIssues();
}
