import { getConfig, writeJSONFile } from "./util.ts";
import { toZhHant } from "./to-zh-hant.ts";
import log from "./log.ts";
export default async function buildConfig() {
  const config = await getConfig();

  config.translations = getNewTranslations(config.translations);

  const sites = config.sites;
  const siteIdentifiers = Object.keys(sites);
  for (const siteIdentifier of siteIdentifiers) {
    const siteConfig = sites[siteIdentifier];
    siteConfig.translations = getNewTranslations(siteConfig.translations || {});
  }
  // translate site translations
  // test if equal

  try {
    const oldJson = await Deno.readTextFile("config.gen.json");
    const newJson = JSON.stringify(config, null, 2);
    if (oldJson !== newJson) {
      log.info(`write new config.gen.json`);
      await writeJSONFile("./config.gen.json", config);
    } else {
      log.info(`no change, skip write new config.gen.json`);
    }
  } catch (_e) {
    log.info(`write new config.gen.json`);
    await writeJSONFile("./config.gen.json", config);
  }

  // to json
}
if (import.meta.main) {
  buildConfig();
}

function getNewTranslations(
  translations: Record<string, Record<string, string>>,
): Record<string, Record<string, string>> {
  const newTranslations = { ...translations };

  if (translations["zh-Hans"]) {
    const keys = Object.keys(translations["zh-Hans"]);
    for (const key of keys) {
      if (!newTranslations["zh-Hant"]) {
        newTranslations["zh-Hant"] = {};
      }
      newTranslations["zh-Hant"][key] = toZhHant(translations["zh-Hans"][key]);
    }
  }
  return newTranslations;
}
