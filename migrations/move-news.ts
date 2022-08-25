import { fs } from "../deps.ts";
import Adapter, { NewsItem } from "./news-adapter.ts";
import { isDev, readJSONFile, writeJSONFile } from "../util.ts";
import log from "../log.ts";
import { DEV_MODE_HANDLED_ITEMS } from "../constant.ts";
export default async function moveReddit() {
  // get all 1-raw files
  // is exists raw files folder

  const files: string[] = [];
  try {
    let totalFiles = 0;
    for await (
      const entry of fs.walk(
        "../inbox/ts-new/data/redirect-newstop",
      )
    ) {
      if (isDev()) {
        if (totalFiles >= DEV_MODE_HANDLED_ITEMS) {
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
    log.info(`total files: ${files.length}`);
    for (const file of files) {
      // if total can divide by 100
      if (total % 100 === 0) {
        log.info(`handled: ${total}`);
      }
      const originalItem = await readJSONFile(file) as NewsItem;
      const item = new Adapter(
        originalItem,
        "news",
      );
      await item.init();
      try {
        const itemJson = await item.getFormatedItem();

        // write formated item to file
        await writeJSONFile(
          item.getFormatedPath(["news"]),
          itemJson,
        );

        total += 1;
        log.debug(
          `formated item to ${item.getFormatedPath(["news"])}`,
        );
      } catch (e) {
        log.warn("ignore error when format item", e);
      }
    }
  }
  log.info(
    `formated ${total} items`,
  );
}

if (import.meta.main) {
  await moveReddit();
}
