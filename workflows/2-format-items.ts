import { fs, path } from "../deps.ts";
import { FormatedItem, ItemsJson, RunOptions } from "../interface.ts";
import adapters from "../adapters/mod.ts";
import {
  callWithTimeout,
  getCurrentItemsFilePath,
  getDataFormatedPath,
  getDataRawPath,
  getDataTranslatedPath,
  getFilesByTargetSiteIdentifiers,
  getTargetSiteIdentifiersByFilePath,
  identifierToCachedKey,
  isDev,
  parseItemIdentifierWithTime,
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
  let { files, targetSiteIdentifiers } = await getFilesByTargetSiteIdentifiers(
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
    // ensure translated folder exists
    await fs.ensureDir(getDataTranslatedPath());
    // also load all current and translated image cache
    for await (const entry of fs.walk(getDataTranslatedPath())) {
      if (entry.isFile && entry.name.endsWith(".json")) {
        const translationJson = await readJSONFile(entry.path) as FormatedItem;

        if (translationJson.image) {
          imageCachedMap[translationJson.url] = translationJson.image;
        }
      }
    }

    // get current Itemsjson
    for (const siteIdentifier of targetSiteIdentifiers) {
      const currentItemsPath = getCurrentItemsFilePath(siteIdentifier);
      let currentItemsJson: ItemsJson = {
        items: {},
      };
      try {
        currentItemsJson = await readJSONFile(currentItemsPath);
      } catch (e) {
        log.debug(`read current items file failed, ${e.message}`);
      }
      for (const key of Object.keys(currentItemsJson.items)) {
        if (currentItemsJson.items[key].image) {
          imageCachedMap[currentItemsJson.items[key].url] = currentItemsJson
            .items[key].image!;
        }
      }
    }

    log.info(
      `found ${Object.keys(imageCachedMap).length} current  items image cache`,
    );

    log.info(`start formating, ${files.length} files`);

    // resort files by time, old to time, cause published time will be old to new
    files = files.sort((a, b) => {
      const aParsed = parseItemIdentifierWithTime(path.basename(a, ".json"));
      const bParsed = parseItemIdentifierWithTime(path.basename(b, ".json"));
      const aOrder = Number(aParsed.order);
      const bOrder = Number(bParsed.order);
      const aTime = new Date(
        Date.UTC(
          Number(aParsed.year),
          Number(aParsed.month),
          Number(aParsed.day),
          Number(aParsed.hour),
          Number(aParsed.minute),
          Number(aParsed.second),
          Number(aParsed.millisecond),
        ),
      ).getTime();
      const bTime = new Date(
        Date.UTC(
          Number(bParsed.year),
          Number(bParsed.month),
          Number(bParsed.day),
          Number(bParsed.hour),
          Number(bParsed.minute),
          Number(bParsed.second),
          Number(bParsed.millisecond),
        ),
      ).getTime();
      return (aTime + aOrder) - (bTime + bOrder);
    });

    for (const file of files) {
      const filenmae = path.basename(file);
      const targetSiteIdentifiers = getTargetSiteIdentifiersByFilePath(file);
      const parsedFilename = parseItemIdentifierWithTime(filenmae);
      const originalItem = await readJSONFile(file) as Record<
        string,
        unknown
      >;
      // no need to init, cause only get raw data need to init.
      // await item.init();
      let item;
      let itemJson;
      try {
        item = new (adapters[parsedFilename.type])(
          originalItem,
        );
        // delay 10 ms
        await new Promise((resolve) => setTimeout(resolve, 2));
        itemJson = await callWithTimeout(
          item.getFormatedItem.bind(item, { imageCachedMap }),
          30000,
        );
      } catch (e) {
        log.warn(`try to format ${file} error`);
        log.warn(e);
        continue;
      }

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
        log.info(`${total}/${files.length} items formated`);
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
