import { fs, path } from "../deps.ts";
import { RunOptions } from "../interface.ts";
import adapters from "../adapters/mod.ts";
import Item from "../item.ts";
import {
  getDataRawPath,
  getFilesByTargetSiteIdentifiers,
  getTargetSiteIdentifiersByFilePath,
  isDev,
  readJSONFile,
  writeJSONFile,
} from "../util.ts";
import log from "../log.ts";
export default async function formatItems(
  options: RunOptions,
) {
  // get all 1-raw files
  // is exists raw files folder
  await fs.ensureDir(getDataRawPath());
  const sites = options.siteIdentifiers || [];
  const { files } = await getFilesByTargetSiteIdentifiers(
    getDataRawPath(),
    sites,
  );

  let total = 0;
  if (files.length > 0) {
    for (const file of files) {
      const filenmae = path.basename(file);
      const targetSiteIdentifiers = getTargetSiteIdentifiersByFilePath(file);
      const parsedFilename = Item.parseItemIdentifier(filenmae);
      const originalItem = await readJSONFile(file) as Record<
        string,
        unknown
      >;
      const item = new (adapters[parsedFilename.type])(
        originalItem,
      );
      await item.init();
      const itemJson = await item.getFormatedItem();

      // write formated item to file
      await writeJSONFile(
        item.getFormatedPath(targetSiteIdentifiers),
        itemJson,
      );
      // then delete raw file
      if (!isDev()) {
        await Deno.remove(file);
      }
      total += 1;
      log.debug(
        `formated item to ${item.getFormatedPath(targetSiteIdentifiers)}`,
      );
    }
  }
  log.info(
    `formated ${total} items`,
  );
}
