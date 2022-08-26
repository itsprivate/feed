import { fs, path } from "../deps.ts";
import { RunOptions } from "../interface.ts";
import adapters from "../adapters/mod.ts";
import {
  getDataFormatedPath,
  getDataRawPath,
  getFilesByTargetSiteIdentifiers,
  getTargetSiteIdentifiersByFilePath,
  identifierToCachedKey,
  isDev,
  parseItemIdentifier,
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
    // first, we need to duduplicate the formated items, cause maybe the item is updated by the 1 fetch-sources, we will only use the latest raw items

    const allFormatedFiles: string[] = [];
    // check if folder exists
    await fs.ensureDir(getDataFormatedPath());
    for await (const entry of fs.walk(getDataFormatedPath())) {
      if (entry.isFile && entry.name.endsWith(".json")) {
        allFormatedFiles.push(entry.path);
      }
    }

    // now we compare allFormatedFiles with files, files is more recent than allFormatedFiles

    const rawFilesMap = new Map<string, string>();
    for (const file of files) {
      const identifier = path.basename(file, ".json");
      const cachedKey = identifierToCachedKey(identifier);
      rawFilesMap.set(cachedKey, file);
    }

    const needToremovedFormatedFiles = allFormatedFiles.filter((file) => {
      const identifier = path.basename(file, ".json");
      const cachedKey = identifierToCachedKey(identifier);
      return rawFilesMap.has(cachedKey);
    });
    if (needToremovedFormatedFiles.length > 0) {
      log.info(
        `remove ${needToremovedFormatedFiles.length} duplicated formated files`,
      );
    }
    const imageCachedMap: Record<string, string> = {};
    // remove duplicated formated files
    for (const file of needToremovedFormatedFiles) {
      const formatedJson = await readJSONFile(file);
      if (formatedJson.image && formatedJson.url) {
        imageCachedMap[formatedJson.url] = formatedJson.image;
      }
      await Deno.remove(file);
    }
    log.info(`start formating, ${files.length} files`);
    for (const file of files) {
      const filenmae = path.basename(file);
      const targetSiteIdentifiers = getTargetSiteIdentifiersByFilePath(file);
      const parsedFilename = parseItemIdentifier(filenmae);
      const originalItem = await readJSONFile(file) as Record<
        string,
        unknown
      >;

      const item = new (adapters[parsedFilename.type])(
        originalItem,
      );
      // no need to init, cause only get raw data need to init.
      // await item.init();
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
      if (total % 10 === 0) {
        log.info(`${total}/${files} items formated`);
      }
      log.debug(
        `formated item to ${item.getFormatedPath(targetSiteIdentifiers)}`,
      );
    }
  }
  log.info(
    `formated ${total} items`,
  );
}
