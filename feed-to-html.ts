import {
  archiveToUrl,
  feedjsonUrlToRssUrl,
  getCurrentTranslations,
  getFeedSiteIdentifiers,
  getGeneralTranslations,
  isDev,
  issueToUrl,
  parsePageUrl,
  siteIdentifierToUrl,
  tagToUrl,
  urlToLanguageUrl,
  urlToSiteIdentifier,
} from "./util.ts";
import { Config, Feedjson } from "./interface.ts";
import { TARGET_SITE_LANGUAEGS } from "./constant.ts";
import { minifyHTML, mustache } from "./deps.ts";
export default function feedToHTML(
  feedJson: Feedjson,
  config: Config,
  indexTemplateString: string,
): string {
  const sitesMap = config.sites;
  const homepage = feedJson.home_page_url;
  if (!homepage) {
    throw new Error(`home_page_url not found for feedjson`);
  }
  const siteIdentifier = urlToSiteIdentifier(homepage, config);
  let siteConfig = sitesMap[siteIdentifier] || {};
  let isArchive = false;

  if (siteIdentifier === config.archive.siteIdentifier) {
    isArchive = true;
  }
  let subsite = "";
  if (isArchive) {
    const routeInfo = parsePageUrl(homepage);
    const splited = routeInfo.pathname.split("/");
    subsite = splited[1];
    siteConfig = sitesMap[subsite] || {};
  }

  const languageCode = feedJson.language;
  if (!languageCode) {
    throw new Error(`language code not found for feedjson`);
  }
  const languages = TARGET_SITE_LANGUAEGS;
  const language = languages.find((lang) => lang.code === languageCode);
  if (!language) {
    throw new Error(`language code ${languageCode} not found`);
  }
  const currentTranslations = getGeneralTranslations(
    languageCode,
    config,
  );
  feedJson = {
    ...currentTranslations,
    ...feedJson,
  };

  feedJson.items = feedJson.items.map((item, index) => {
    const newItem = { ...item };
    const order = index + 1;
    // @ts-ignore: new meta
    newItem.order = order;
    return newItem;
  });

  if (siteConfig.max_image_height) {
    // @ts-ignore: new meta
    feedJson._max_image_height = siteConfig.max_image_height;
  }

  // @ts-ignore: add meta data
  feedJson._languages = languages.map((item) => {
    const newItem = { ...item };
    // @ts-ignore: add meta data
    newItem.active = item.code === language.code;
    // @ts-ignore: add meta data
    newItem.url = urlToLanguageUrl(homepage, item.prefix);
    return newItem;
  });
  // related sites is has common tags sites
  const otherSites: string[] = [];
  const relatedSites = getFeedSiteIdentifiers(config).filter((site) => {
    const siteTags = sitesMap[site].tags;
    const currentSiteTags = feedJson._site_tags;
    if (sitesMap[site].dev === true) {
      return false;
    }
    // ignore self
    if (site === siteIdentifier) {
      return false;
    }
    if (siteTags && currentSiteTags) {
      const isRelated = siteTags.some((tag) => currentSiteTags.includes(tag));
      if (isRelated) {
        return true;
      } else {
        otherSites.push(site);
        return false;
      }
    } else {
      otherSites.push(site);
      return false;
    }
  });
  // resort ,self is no.1
  // relatedSites.sort((a, b) => {
  //   if (a === siteIdentifier) {
  //     return -1;
  //   }
  //   if (b === siteIdentifier) {
  //     return 1;
  //   }
  //   return 0;
  // });

  //@ts-ignore: add meta data
  feedJson._related_sites = relatedSites.map(
    (item, index) => {
      const siteTranslations = getCurrentTranslations(
        item,
        language.code,
        config,
      );
      const siteShortName = siteTranslations.short_title;
      const siteName = siteTranslations.title;
      return {
        //@ts-ignore: add meta data
        name: siteShortName || siteName,
        url: siteIdentifierToUrl(item, "/" + language.prefix, config),
        is_last: index === relatedSites.length - 1,
        active: item === siteIdentifier,
      };
    },
  );
  //@ts-ignore: add meta data
  feedJson._other_sites = otherSites.map(
    (item, index) => {
      const siteTranslations = getCurrentTranslations(
        item,
        language.code,
        config,
      );
      const siteShortName = siteTranslations.short_title;
      const siteName = siteTranslations.title;

      return {
        //@ts-ignore: add meta data
        name: siteShortName || siteName,
        url: siteIdentifierToUrl(item, "/" + language.prefix, config),
        is_last: index === otherSites.length - 1,
      };
    },
  );
  // @ts-ignore: add meta data
  feedJson._rss_url = feedjsonUrlToRssUrl(feedJson.feed_url);
  // @ts-ignore: add meta data
  // feedJson._atom_url = siteIdentifierToUrl(
  //   siteIdentifier,
  //   "/" + language.prefix + "atom.xml",
  //   config,
  // );
  if (feedJson._tags) {
    // @ts-ignore: add meta data
    feedJson._tag_list = feedJson._tags.map((tag, index) => {
      return {
        name: tag,
        url: tagToUrl(tag, subsite || siteIdentifier, language, config),
        is_last: index === feedJson._tags!.length - 1,
      };
    });
  }
  // archive
  if (feedJson._archive) {
    // @ts-ignore: add meta data
    feedJson._archive_list = feedJson._archive.map((item, index) => {
      return {
        name: item,
        url: archiveToUrl(item, subsite || siteIdentifier, language, config),
        is_last: index === feedJson._archive!.length - 1,
      };
    });
  }

  // issues
  if (feedJson._issues) {
    // @ts-ignore: add meta data
    feedJson._issue_list = feedJson._issues.map((item, index) => {
      return {
        name: item,
        url: issueToUrl(item, subsite || siteIdentifier, language, config),
        is_last: index === feedJson._issues!.length - 1,
      };
    });
  }

  // build index.html
  // @ts-ignore: js package does not have type for mustache
  const output = mustache.render(indexTemplateString, feedJson);
  // is dev
  if (!isDev()) {
    return minifyHTML(output, {
      minifyCSS: true,
      minifyJS: true,
    });
  }
  return output;
}
