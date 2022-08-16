import {
  colors,
  datetime,
  flags,
  fs,
  jsonfeedToAtom,
  jsonfeedToRSS,
  mustache,
  path,
  YAML,
} from "../deps.ts";
import {
  Author,
  Config,
  FormatedItem,
  Link,
  RunOptions,
} from "../interface.ts";

import {
  formatHumanTime,
  generateIcons,
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
  getDistPath,
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
} from "../constant.ts";

export default async function buildSite(options: RunOptions) {
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
  const sites = options.domains;
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
      const siteConfig = sitesMap[domain];

      // multiple languages support
      const languages = TARGET_SITE_LANGUAEGS;
      for (const language of languages) {
        let currentTranslations = translations[language.code] ?? {};
        // merge site translations
        currentTranslations = {
          ...currentTranslations,
          ...siteConfig.translations[language.code],
        };
        // check config
        if (!currentTranslations.title) {
          throw new Error(
            `${domain} config missing title for language ${language.code}`,
          );
        }
        // check description
        if (!currentTranslations.description) {
          throw new Error(
            `${domain} config missing description for language ${language.code}`,
          );
        }

        const items: Record<string, unknown>[] = [];
        currentItemsJsonKeysSorted.forEach((key) => {
          const item = currentItemsJson[key] as FormatedItem;
          const itemUrl = item["url"];
          const itemUrlObj = new URL(itemUrl);
          const translationObj = item._translations[language.code];

          const translationFields = Object.keys(translationObj);
          for (const translationField of translationFields) {
            const translationValue = translationObj[translationField];
            item[translationField] = translationValue;
          }

          let summary = "";

          let content_html =
            `${item.title} - <a href="${itemUrlObj.protocol}//${itemUrlObj.hostname}">${itemUrlObj.hostname}</a>`;

          if (
            item.authors && Array.isArray(item.authors) &&
            item.authors.length > 0
          ) {
            content_html += " by ";
            for (const author of item.authors) {
              content_html +=
                ` <a class="p-author author h-card" rel="author" href="${author.url}">${author.name}</a>`;
            }
          }

          content_html +=
            `<br><time class="dt-published published" datetime="${item.date_published}">${
              formatHumanTime(
                new Date(item.date_published as string),
              )
            }</time>`;

          for (const link of item._links) {
            const linkName = currentTranslations[link.name] ??
              link.name;
            summary += `${linkName}: ${link.url}\n`;
            content_html += ` <a href="${link.url}">${linkName}</a>`;
          }
          item.summary = summary;
          item.content_text = summary;
          item.content_html = content_html;
          // add feed 1.0 adapter author
          if (
            item.authors && Array.isArray(item.authors) &&
            item.authors.length > 0
          ) {
            item.author = item.authors[0];
          }
          items.push(item);
        });
        let feedJson = {
          "version": "https://jsonfeed.org/version/1",
          "title": currentTranslations.title,
          "description": currentTranslations.description,
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

        // build atom.xml
        // @ts-ignore: npm module
        const atomOutput = jsonfeedToAtom(feedJson);
        // write to dist file
        const atomPath = getDistFilePath(domain, "atom.xml");
        await writeTextFile(atomPath, atomOutput);

        // build rss.xml
        // @ts-ignore: npm module
        const rssOutput = jsonfeedToRSS(feedJson);
        // write to dist file
        const rssPath = getDistFilePath(domain, "rss.xml");
        await writeTextFile(rssPath, rssOutput);

        feedJson = {
          ...currentTranslations,
          ...feedJson,
        };

        // @ts-ignore: add meta data
        feedJson._languages = languages.map((item) => {
          // @ts-ignore: add meta data
          item.active = item.code === language.code;
          // @ts-ignore: add meta data
          item.url = `/${item.prefix}`;
          return item;
        });
        // related sites is has common tags sites
        const otherSites: string[] = [];
        const relatedSites = Object.keys(sitesMap).filter((site) => {
          const siteTags = sitesMap[site].tags;
          const currentSiteTags = siteConfig.tags;
          // ignore self
          if (site === domain) {
            return false;
          }
          if (siteTags && currentSiteTags) {
            return siteTags.some((tag) => currentSiteTags.includes(tag));
          } else {
            otherSites.push(site);
            return false;
          }
        });
        //@ts-ignore: add meta data
        feedJson._related_sites = relatedSites.map(
          (item, index) => {
            const itemSiteConfig = sitesMap[item];
            const siteTranslations = itemSiteConfig.translations[language.code];
            const siteShortName = siteTranslations.short_title;
            const siteName = siteTranslations.title;
            return {
              //@ts-ignore: add meta data
              name: siteShortName || siteName,
              url: `https://${item}/` + language.prefix,
              is_last: index === relatedSites.length - 1,
            };
          },
        );
        //@ts-ignore: add meta data
        feedJson._other_sites = otherSites.map(
          (item, index) => {
            const siteShortName = currentTranslations.short_title;
            const siteName = currentTranslations.title;
            return {
              //@ts-ignore: add meta data
              name: siteShortName || siteName,
              url: `https://${item}/` + language.prefix,
              is_last: index === otherSites.length - 1,
            };
          },
        );
        // @ts-ignore: add meta data
        feedJson._rss_url = `https://${domain}/rss.xml`;
        // @ts-ignore: add meta data
        feedJson._atom_url = `https://${domain}/atom.xml`;
        // build index.html
        const indexTemplateString = await Deno.readTextFile(
          "./templates/index.html",
        );
        // build index.html
        // @ts-ignore: js package does not have type for mustache
        const output = mustache.render(indexTemplateString, feedJson);
        const indexPath = getDistFilePath(domain, "index.html");
        await writeTextFile(indexPath, output);

        // copy static files
        try {
          await generateIcons(domain);
        } catch (e) {
          console.log("can not generate icons for ", domain);
          throw e;
        }
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
