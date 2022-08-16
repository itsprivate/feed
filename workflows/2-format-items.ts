import { fs } from "../deps.ts";
import { RunOptions } from "../interface.ts";
import adapters from "../adapters/mod.ts";
import Item from "../item.ts";
import { getDataRawPath, writeJSONFile } from "../util.ts";
import log from "../log.ts";

export default async function formatItems(
  _options: RunOptions,
) {
  // get all 1-raw files
  // is exists raw files folder
  try {
    let total = 0;

    for await (const entry of fs.walk(getDataRawPath())) {
      if (entry.isFile) {
        const parsedFilename = Item.parseFilename(entry.name);
        const originalItem = JSON.parse(
          await Deno.readTextFile(entry.path),
        ) as Record<string, unknown>;

        const item = new (adapters[parsedFilename.type])(
          originalItem,
          parsedFilename.targetSite,
        );
        // write formated item to file
        await writeJSONFile(
          item.getFormatedPath(),
          item.getFormatedItem(),
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
