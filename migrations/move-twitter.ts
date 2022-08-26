import { fs } from "../deps.ts";
import Adapter, { TwitterItem } from "./twitter-adapter.ts";
import { isDev, readJSONFile, writeJSONFile } from "../util.ts";
import log from "../log.ts";
import { DEV_MODE_HANDLED_ITEMS } from "../constant.ts";
export default async function move() {
  // get all 1-raw files
  // is exists raw files folder
  const siteIdentifier = "economist";
  let files: string[] = [];
  try {
    let totalFiles = 0;
    for await (
      const entry of fs.walk(
        "../inbox/ts-new/data/tweet-economist",
      )
    ) {
      if (isDev()) {
        if (totalFiles >= 100) {
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
  // files = ["./migrations/twitter2.json"];
  let total = 0;

  if (files.length > 0) {
    log.info(`total files: ${files.length}`);
    for (const file of files) {
      // if total can divide by 100
      if (total % 100 === 0) {
        log.info(`handled: ${total}`);
      }
      const originalItem = await readJSONFile(file) as TwitterItem;
      // is quoted status
      // then contineu
      if (originalItem.quoted_status) {
        // quoted_status
        continue;
      }
      const item = new Adapter(
        originalItem,
      );
      // await item.init();
      try {
        const itemJson = await item.getFormatedItem();

        // write formated item to file
        await writeJSONFile(
          item.getFormatedPath([siteIdentifier]),
          itemJson,
        );

        total += 1;
        log.debug(
          `formated item to ${item.getFormatedPath([siteIdentifier])}`,
        );
      } catch (e) {
        log.warn(file + " ignore error when format item", e);
      }
    }
  }
  log.info(
    `formated ${total} items`,
  );
}

if (import.meta.main) {
  await move();
}
