import { fs, path } from "../deps.ts";
import { FormatedItem, RunOptions } from "../interface.ts";
import Item from "../item.ts";
import {
  domainToPath,
  getDataFormatedPath,
  isDev,
  pathToDomain,
  writeJSONFile,
} from "../util.ts";
import log from "../log.ts";
import Translation from "../translate.ts";
import { DEV_MODE_HANDLED_ITEMS } from "../constant.ts";

export default async function translateItems(
  options: RunOptions,
) {
  // get all 2-formated files
  // is exists formated files folder
  await fs.ensureDir(getDataFormatedPath());

  let domains: string[] = [];

  for await (const dirEntry of Deno.readDir(getDataFormatedPath())) {
    if (dirEntry.isDirectory && !dirEntry.name.startsWith(".")) {
      domains.push(pathToDomain(dirEntry.name));
    }
  }
  const sites = options.domains;
  if (sites && Array.isArray(sites)) {
    domains = domains.filter((domain) => {
      return (sites as string[]).includes(domain);
    });
  }
  if (domains.length > 0) {
    // yes
    // start instance
    const translation = new Translation();
    await translation.init();

    for (const domain of domains) {
      let total = 0;
      const files: string[] = [];
      try {
        let totalFiles = 0;
        for await (
          const entry of fs.walk(
            getDataFormatedPath() + "/" + domainToPath(domain),
          )
        ) {
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
        for (const file of files) {
          const item = JSON.parse(
            await Deno.readTextFile(file),
          ) as FormatedItem;
          const filename = path.basename(file);
          const parsedFilename = Item.parseItemIdentifier(filename);

          const originalTranslations =
            item._translations[item._original_language];
          const originalTranslationKeys = Object.keys(originalTranslations);
          const translations = {
            ...item._translations,
          };
          const translatedJson = {
            ...item,
          } as Record<string, unknown>;
          for (const field of originalTranslationKeys) {
            const value = originalTranslations[field];
            log.debug(
              `translating ${parsedFilename.type} ${parsedFilename.language} ${field}: ${value} for ${parsedFilename.targetSite}`,
            );
            const translated = await translation.translate(
              value,
              item._original_language,
            );

            log.debug("translated", translated);

            const translatedKeys = Object.keys(translated);
            for (const key of translatedKeys) {
              if (!translations[key]) {
                translations[key] = {};
              }
              translations[key][field] = translated[key];
            }
          }
          translatedJson._translations = translations;

          // write translated item to file
          const translatedPath = Item.getTranslatedPath(filename);

          await writeJSONFile(
            translatedPath,
            translatedJson,
          );
          // remove formated file
          await Deno.remove(file);

          total += 1;
        }

        // close instance
        log.info(`translated ${total} items`);
      }
    }
    await translation.close();
  }
}
