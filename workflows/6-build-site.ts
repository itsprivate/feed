import { colors, datetime, flags, fs, mustache, path, YAML } from "../deps.ts";
import {
  Author,
  Config,
  FormatedItem,
  Link,
  RunOptions,
} from "../interface.ts";
import adapters from "../adapters/mod.ts";
import Item from "../item.ts";
import {
  formatHumanTime,
  get,
  getArchivedItemsFilePath,
  getConfig,
  getCurrentItemsFilePath,
  getCurrentToBeArchivedItemsFilePath,
  getDataCurrentItemsPath,
  getDataFormatedPath,
  getDataRawPath,
  getDataTranslatedPath,
  getDistFilePath,
  isDev,
  readJSONFile,
  writeJSONFile,
  writeTextFile,
} from "../util.ts";
import log from "../log.ts";
import Translation from "../translate.ts";
import {
  DEV_MODE_HANDLED_ITEMS,
  MAX_ITEMS_PER_PAGE,
  TARGET_SITE_LANGUAEGS,
  TRANSLATED_ITEMS_PER_PAGE,
} from "../constant.ts";

export default async function buildSite(options: RunOptions | undefined = {}) {
  const config = await getConfig();
  const translations = config.translations ?? {};
  const sitesMap = config.sites;
  const currentDataPath = getDataCurrentItemsPath();
  let domains: string[] = [];

  for await (const dirEntry of Deno.readDir(currentDataPath)) {
    if (dirEntry.isDirectory && !dirEntry.name.startsWith(".")) {
      domains.push(dirEntry.name);
    }
  }
  const sites = options.sites;
  if (sites && Array.isArray(sites)) {
    domains = domains.filter((domain) => {
      return (sites as string[]).includes(domain);
    });
  }
  for (const domain of domains) {
    const currentItemsFilePath = getCurrentItemsFilePath(
      domain,
    );
    let currentItemsJson: Record<
      string,
      FormatedItem
    > = {};
    try {
      currentItemsJson = await readJSONFile(
        currentItemsFilePath,
      );
    } catch (_e) {
      // ignore
    }

    //check if need to archive items
    const currentItemsJsonKeys = Object.keys(
      currentItemsJson,
    );
    const currentItemsJsonKeysSorted = currentItemsJsonKeys
      .sort((a, b) => {
        const aModified = currentItemsJson[a]["date_modified"]!;
        const bModified = currentItemsJson[b]["date_modified"]!;
        return new Date(aModified) > new Date(bModified) ? -1 : 1;
      });

    if (currentItemsJsonKeysSorted.length > 0) {
      const siteConfig = sitesMap[domain].site as unknown as Record<
        string,
        string
      >;

      // multiple languages support
      const languages = TARGET_SITE_LANGUAEGS;
      for (const language of languages) {
        // check config
        if (!siteConfig["_title_" + language.code]) {
          throw new Error(
            `${domain} config missing title for language ${language.code}`,
          );
        }
        // check description
        if (!siteConfig["_description_" + language.code]) {
          throw new Error(
            `${domain} config missing description for language ${language.code}`,
          );
        }

        const items: Record<string, unknown>[] = [];
        currentItemsJsonKeysSorted.forEach((key) => {
          const item = currentItemsJson[key] as FormatedItem;
          const itemUrl = item["url"];
          const itemUrlObj = new URL(itemUrl);
          item.title = item[`_title_${language.code}`] as string;
          let summary = "";

          let content_html = `<cite>${
            item[`_title_${item._original_language}`]
          } - ${itemUrlObj.hostname}</cite><br/>`;
          for (const link of item._links) {
            const linkName = translations[link.name]?.[language.code] ??
              link.name;
            summary += `${linkName}: ${link.url}\n`;
            content_html += `<a href="${link.url}">${linkName}</a>\n`;
          }
          item.summary = summary;
          item.content_text = summary;
          item.content_html = content_html;
          items.push(item);
        });
        const feedJson = {
          "version": "https://jsonfeed.org/version/1.1",
          "title": siteConfig["_title_" + language.code],
          "description": siteConfig["_description_" + language.code],
          "icon": `https://${domain}/icon.png`,
          "favicon": `https://${domain}/favicon.ico`,
          "language": language.code,
          "home_page_url": `https://${domain}/`,
          "feed_url": `https://${domain}/feed.json`,
          items,
        };
        // write to dist file
        const feedPath = getDistFilePath(domain, "feed.json");
        await writeJSONFile(feedPath, feedJson);
        // add some meta data to feedJson
        feedJson.items = feedJson.items.map((item) => {
          item.date_published_time = formatHumanTime(
            new Date(item.date_published as string),
          );
          return item;
        });

        // build index.html
        let output = "";
        const indexTemplateString = await Deno.readTextFile(
          "./templates/index.html.tmpl",
        );
        // build index.html
        // @ts-ignore: js package does not have type for mustache
        output = mustache.render(indexTemplateString, feedJson);
        const indexPath = getDistFilePath(domain, "index.html");

        await writeTextFile(indexPath, output);

        // build atom.xml

        // build rss.xml
        log.info(`${domain} build success`);
      }
    } else {
      log.info(
        `skip build ${domain}, cause no items to be build`,
      );
    }
    // latest item date_modified is greater Monday
    // we will run archive task, try to archive all items of their week
  }
}
