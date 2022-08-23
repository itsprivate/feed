import { fs } from "../deps.ts";
import {
  getArchivePath,
  getCurrentIssuesFilePath,
  getFullDay,
  getFullMonth,
  getFullYear,
  getMigratedIssueMapPath,
  isDev,
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
  const siteIdentifier = "reddit";
  const type = "reddit";
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
        "../inbox/ts-new/data/reddit-top-issues",
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

  if (files.length > 0) {
    for (const file of files) {
      // if total can divide by 100
      if (total % 100 === 0) {
        log.info(`handled: ${total}`);
      }
      const originalItem = await readJSONFile(file) as OldIssue;
      const newItems: ItemsJson = { items: {} };
      const items = originalItem.items;
      for (const item of items) {
        const id = item.slug;
        // try to find new id
        const oldFile = `../inbox/ts-new/data/reddit-top${
          id.slice(item.type.length + 1, -1)
        }.json`;
        const json = await readJSONFile(oldFile) as Record<
          string,
          string | number
        >;
        const originalCreated = new Date(
          Number(json.original_created_utc) * 1000,
        );
        const weekInfo = weekOfYear(originalCreated);
        const newIdentifier = `${getFullYear(originalCreated)}_${
          getFullMonth(originalCreated)
        }_${getFullDay(originalCreated)}_en_${type}_${siteIdentifier}__${
          getId(json.permalink as string)
        }`;
        const newPath =
          `archive/${siteIdentifier}/archive/${weekInfo.path}/items.json`;
        try {
          const newJson = await readJSONFile(newPath) as ItemsJson;
          // find items
          newItems.items[newIdentifier] = newJson.items[newIdentifier];
        } catch (e) {
          log.warn("ignore error when format item", e);
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
  const issueIndexPath = getCurrentIssuesFilePath(siteIdentifier);
  issues = resortArchiveKeys(issues);
  await writeJSONFile(getMigratedIssueMapPath(), oldAndNewMap);
  console.log("issues", issues);
  await writeJSONFile(issueIndexPath, issues);
  log.info(
    `formated ${total} items`,
  );
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
  Reddit = "reddit",
}
if (import.meta.main) {
  await moveIssues();
}
