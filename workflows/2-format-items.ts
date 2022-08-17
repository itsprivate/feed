import { fs } from "../deps.ts";
import { RunOptions } from "../interface.ts";
import adapters from "../adapters/mod.ts";
import Item from "../item.ts";
import { getDataRawPath, isDev, writeJSONFile } from "../util.ts";
import log from "../log.ts";
import { DEV_MODE_HANDLED_ITEMS } from "../constant.ts";
export default async function formatItems(
  _options: RunOptions,
) {
  // get all 1-raw files
  // is exists raw files folder
  try {
    let total = 0;

    for await (const entry of fs.walk(getDataRawPath())) {
      if (entry.isFile) {
        if (isDev()) {
          if (total >= DEV_MODE_HANDLED_ITEMS) {
            log.info(`dev mode, only take ${DEV_MODE_HANDLED_ITEMS} files`);
            break;
          }
        }
        const parsedFilename = Item.parseFilename(entry.name);
        const originalItem = JSON.parse(
          await Deno.readTextFile(entry.path),
        ) as Record<string, unknown>;

        const item = new (adapters[parsedFilename.type])(
          originalItem,
          parsedFilename.targetSite,
        );

        const itemJson = await item.getFormatedItem();

        // write formated item to file
        await writeJSONFile(
          item.getFormatedPath(),
          itemJson,
        );
        // then delete raw file
        await Deno.remove(entry.path);
        total += 1;
        log.debug(
          `formated item to ${item.getFormatedPath()}`,
        );
      }
    }
    log.info(
      `formated ${total} items`,
    );
  } catch (e) {
    if (e.name === "NotFound") {
      // not exists, skip
      log.info("skip format stage, cause no raw files");
    } else {
      throw e;
    }
  }
}
