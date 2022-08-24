import { fs } from "../deps.ts";
import { FormatedItem, ItemsJson, RunOptions } from "../interface.ts";
import {
  callWithTimeout,
  getCurrentItemsFilePath,
  getDataFormatedPath,
  getFilesByTargetSiteIdentifiers,
  getTargetSiteIdentifiersByFilePath,
  isDev,
  readJSONFile,
  writeJSONFile,
} from "../util.ts";
import log from "../log.ts";
import Translation from "../translate.ts";
import { TARGET_SITE_LANGUAEGS } from "../constant.ts";
import SourceItemAdapter from "../adapters/source.ts";
export default async function translateItems(
  options: RunOptions,
) {
  // get all 2-formated files
  // is exists formated files folder
  await fs.ensureDir(getDataFormatedPath());
  const sites = options.siteIdentifiers || [];
  const { files, targetSiteIdentifiers } =
    await getFilesByTargetSiteIdentifiers(
      getDataFormatedPath(),
      sites,
    );
  if (files.length > 0) {
    const currentKeysMap = new Map<string, FormatedItem>();
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
        currentKeysMap.set(key, currentItemsJson.items[key]);
      }
    }

    // yes
    // start instance
    const translation = new Translation();
    await translation.init();

    let total = 0;

    log.info(`start translate ${files.length} items`);
    for (const file of files) {
      if (total % 100 === 0) {
        log.info(`translated ${total} items `);
      }
      const item = JSON.parse(
        await Deno.readTextFile(file),
      ) as FormatedItem;

      const itemInstance = new SourceItemAdapter(item);
      const originalTranslations = (item._translations
        ? item
          ._translations[item._original_language]
        : {}) as Record<string, string>;
      const originalTranslationKeys = Object.keys(originalTranslations);
      // try to find 3-translations to get cached items

      // write translated item to file
      const targetSiteIdentifiers = getTargetSiteIdentifiersByFilePath(file);
      const translatedPath = itemInstance.getTranslatedPath(
        targetSiteIdentifiers,
      );
      const translations = {
        ...item._translations,
      };
      // is exists translated file
      let translatedItem: FormatedItem | undefined;

      try {
        translatedItem = await readJSONFile(translatedPath) as FormatedItem;
      } catch (_e) {
        // ignore
      }

      if (translatedItem) {
        if (translatedItem._translations) {
          const cachedKeys = Object.keys(translatedItem._translations);
          for (const key of cachedKeys) {
            if (!translations[key]) {
              log.debug(
                `use cached translation for ${key}`,
                translatedItem._translations[key],
              );
              translations[key] = {
                ...translatedItem._translations[key],
                ...translations[key],
              };
            }
          }
        }
      }

      if (currentKeysMap.has(itemInstance.getItemIdentifier())) {
        const cachedTranslations =
          currentKeysMap.get(itemInstance.getItemIdentifier())!._translations;

        if (cachedTranslations) {
          const cachedKeys = Object.keys(cachedTranslations);
          for (const key of cachedKeys) {
            if (!translations[key]) {
              log.debug(
                `use cached translation for ${key}`,
                cachedTranslations[key],
              );
              translations[key] = {
                ...cachedTranslations[key],
                ...translations[key],
              };
            }
          }
        }
      }
      const translatedJson = {
        ...item,
      } as Record<string, unknown>;

      let isTranslated = true;
      if (Deno.env.get("NO_TRANSLATE") === "1") {
        isTranslated = false;
      }
      if (!isTranslated) {
        // do nothing
      } else {
        for (const field of originalTranslationKeys) {
          // first check if this field is translated
          const todoLanguages = [];
          for (const language of TARGET_SITE_LANGUAEGS) {
            if (language.code === item._original_language) {
              continue;
            }

            if (
              translations[language.code] &&
              translations[language.code][field] !== undefined
            ) {
              // yes already translated
              log.debug(`field ${field} already translated, skip`);
              continue;
            }

            todoLanguages.push(language);
          }
          // if todoLanguages is empty, skip
          if (todoLanguages.length === 0) {
            log.debug(`field ${field} already translated, skip`);
            continue;
          }

          const value = originalTranslations[field];
          log.debug(
            `translating ${itemInstance.getType()} ${itemInstance.getLanguage()} ${field}: ${value} `,
          );
          // set timeout, max 100s

          const translated = await callWithTimeout<Record<string, string>>(
            translation.translate.bind(
              translation,
              value,
              item._original_language,
              todoLanguages.map((item) => item.code),
            ),
            100000,
          );
          log.info(
            `${total + 1}/${files.length} translated ${value} to`,
            translated,
          );
          for (const languageCode of Object.keys(translated)) {
            if (!translations[languageCode]) {
              translations[languageCode] = {};
            }
            translations[languageCode][field] = translated[languageCode];
          }
        }
      }

      translatedJson._translations = translations;

      await writeJSONFile(
        translatedPath,
        translatedJson,
      );
      // remove formated file
      if (!isDev()) {
        await Deno.remove(file);
      }
      total += 1;
    }

    // close instance
    log.info(`translated ${total} items`);

    await translation.close();
  }
}
