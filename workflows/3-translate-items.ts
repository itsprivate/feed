import { colors, datetime, flags, fs, path, YAML } from "../deps.ts";
import { Config, FormatedItem, RunOptions } from "../interface.ts";
import adapters from "../adapters/mod.ts";
import Item from "../item.ts";
import {
  get,
  getArchivedItemsFilePath,
  getConfig,
  getCurrentItemsFilePath,
  getCurrentToBeArchivedItemsFilePath,
  getDataCurrentItemsPath,
  getDataFormatedPath,
  getDataRawPath,
  getDataTranslatedPath,
  getDistPath,
  isDev,
  readJSONFile,
  writeJSONFile,
} from "../util.ts";
import log from "../log.ts";
import Translation from "../translate.ts";
import {
  DEV_MODE_HANDLED_ITEMS,
  MAX_ITEMS_PER_PAGE,
  TRANSLATED_ITEMS_PER_PAGE,
} from "../constant.ts";

export default async function translateItems(
  _options: RunOptions | undefined = {},
) {
  // get all 2-formated files
  // is exists formated files folder
  let total = 0;
  const files: string[] = [];
  try {
    let totalFiles = 0;
    for await (const entry of fs.walk(getDataFormatedPath())) {
      if (isDev()) {
        if (totalFiles >= DEV_MODE_HANDLED_ITEMS) {
          log.info(`dev mode, only take ${DEV_MODE_HANDLED_ITEMS} files`);
          break;
        }
      }
      if (entry.isFile) {
        files.push(entry.path);
        totalFiles += 1;
      }
    }
  } catch (e) {
    throw e;
  }
  if (files.length > 0) {
    // yes
    // start instance
    const isMock = Deno.env.get("MOCK") === "1";
    const translation = new Translation({
      mock: isMock,
      countPerPage: TRANSLATED_ITEMS_PER_PAGE,
    });
    await translation.init();

    for (const file of files) {
      const item = JSON.parse(await Deno.readTextFile(file)) as FormatedItem;
      const filename = path.basename(file);
      const parsedFilename = Item.parseFilename(filename);
      log.info(
        `translating ${parsedFilename.type} ${parsedFilename.language} for ${parsedFilename.targetSite}: ${item.title}`,
      );
      const translated = await translation.translate(
        item[`_title_${item._original_language}`] as string,
        item._original_language,
      );
      log.info("translated", translated);
      // write translated item to file
      const translatedPath = Item.getTranslatedPath(filename);
      const translatedJson = {
        ...item,
      } as Record<string, unknown>;
      const translatedKeys = Object.keys(translated);
      for (const key of translatedKeys) {
        translatedJson[`_title_${key}`] = translated[key];
      }
      await writeJSONFile(
        translatedPath,
        translatedJson,
      );
      // remove formated file
      await Deno.remove(file);

      total += 1;
    }

    await translation.close();
    // close instance
    log.info(`translated ${total} items`);
  }
}
