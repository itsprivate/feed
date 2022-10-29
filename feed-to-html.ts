import {
  archiveToUrl,
  feedjsonUrlToRssUrl,
  getCurrentTranslations,
  getFeedSiteIdentifiers,
  getGeneralTranslations,
  isDev,
  issueToUrl,
  parsePageUrl,
  resortSites,
  siteIdentifierToUrl,
  tagToUrl,
  urlToLanguageUrl,
  urlToSiteIdentifier,
  urlToVersionUrl,
} from "./util.ts";
import { Config, Feedjson, Language, Version } from "./interface.ts";
import { mustache } from "./deps.ts";
import { archiveSubDomain, indexSubDomain } from "./constant.ts";
export default function feedToHTML(
  feedJson: Feedjson,
  config: Config,
  indexTemplateString: string,
  languages: Language[],
  versions: Version[],
): string {
  const sitesMap = config.sites;
  const homepage = feedJson.home_page_url;
  if (!homepage) {
    throw new Error(`home_page_url not found for feedjson`);
  }
  let siteIdentifier = urlToSiteIdentifier(homepage, config);
  let siteConfig = sitesMap[siteIdentifier] || {};
  let isArchive = false;

  if (siteIdentifier === archiveSubDomain) {
    isArchive = true;
  }
  if (isArchive) {
    const routeInfo = parsePageUrl(homepage, config.versions, config.languages);
    const splited = routeInfo.pathname.split("/");
    siteIdentifier = splited[1];
    siteConfig = sitesMap[siteIdentifier] || {};
  }

  const languageCode = feedJson.language;
  if (!languageCode) {
    throw new Error(`language code not found for feedjson`);
  }
  const language = languages.find((lang) => lang.code === languageCode);
  if (!language) {
    throw new Error(`language code ${languageCode} not found`);
  }

  const versionCode = feedJson._site_version;
  const version = versions.find((version) => version.code === versionCode);
  if (!version) {
    throw new Error(`version code ${versionCode} not found`);
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
    if (feedJson.items.length > 1) {
      const order = index + 1;
      // @ts-ignore: new meta
      newItem.order = order;
    }
    return newItem;
  });

  if (siteConfig.max_image_height) {
    // @ts-ignore: new meta
    feedJson._max_image_height = siteConfig.max_image_height;
  }

  // @ts-ignore: new meta
  feedJson._is_lite = feedJson._site_version === "lite";

  // @ts-ignore: add meta data
  feedJson._languages = languages.map((item) => {
    const newItem = { ...item };
    // @ts-ignore: add meta data
    newItem.active = item.code === language.code;

    // @ts-ignore: add meta data
    newItem.url = urlToLanguageUrl(
      homepage,
      item.prefix,
      config.versions,
      config.languages,
    );
    return newItem;
  });
  // related sites is has common tags sites
  let otherSites: string[] = [];
  let relatedSites = getFeedSiteIdentifiers(config).concat([
    indexSubDomain,
    "picks",
  ])
    .filter(
      (site) => {
        const siteTags = sitesMap[site].tags;

        const currentSiteTags = feedJson._site_tags;
        if (sitesMap[site].dev === true) {
          return false;
        }
        // ignore self
        if (site === siteIdentifier) {
          return false;
        }

        if (siteTags && siteTags.includes("all")) {
          return true;
        }
        if (siteTags && currentSiteTags) {
          const isRelated = siteTags.some((tag) =>
            currentSiteTags.includes(tag)
          );
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
      },
    );
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

  // resort
  relatedSites = resortSites(relatedSites, config);
  otherSites = resortSites(otherSites, config);
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

      // www does not has lite version
      let url = siteIdentifierToUrl(
        item,
        "/" + language.prefix + version.prefix,
        config,
      );
      if (item === indexSubDomain) {
        url = siteIdentifierToUrl(
          item,
          "/" + language.prefix,
          config,
        );
      }
      if (siteTranslations.url) {
        url = siteTranslations.url;
      }

      return {
        //@ts-ignore: add meta data
        name: siteShortName || siteName,
        url,
        is_last: index === relatedSites.length - 1,
        active: item === siteIdentifier,
      };
    },
  );

  const siteTranslations = getCurrentTranslations(
    siteIdentifier,
    language.code,
    config,
  );
  const siteUrl = siteIdentifierToUrl(
    siteIdentifier,
    "/" + language.prefix + version.prefix,
    config,
  );

  // @ts-ignore: add meta data
  feedJson._site_title = siteTranslations.title;
  // @ts-ignore: add meta data
  feedJson._site_url = siteUrl;
  // @ts-ignore: add meta data
  feedJson._versions = versions.map((item) => {
    const newItem = { ...item };

    newItem.name = currentTranslations[item.name] || item.name;

    // @ts-ignore: add meta data
    newItem.active = item.code === version.code;
    // @ts-ignore: add meta data
    newItem.url = urlToVersionUrl(
      homepage,
      item.prefix,
      config.versions,
      config.languages,
    );
    // @ts-ignore: add meta data
    return newItem;
  });
  // add advice link
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
        url: siteIdentifierToUrl(
          item,
          "/" + language.prefix + version.prefix,
          config,
        ),
        is_last: false,
      };
    },
  );
  // @ts-ignore: add meta data
  feedJson._other_sites.push({
    name: currentTranslations.advice_label,
    url: config.advice_url,
    is_last: true,
  });

  // @ts-ignore: add meta data
  feedJson._atom_url = feedjsonUrlToRssUrl(feedJson.feed_url);

  if (feedJson._tags) {
    // @ts-ignore: add meta data
    feedJson._tag_list = feedJson._tags.map((tag, index) => {
      return {
        name: tag,
        url: tagToUrl(
          tag,
          siteIdentifier,
          language,
          version,
          config,
        ),
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
        url: archiveToUrl(
          item,
          siteIdentifier,
          language,
          version,
          config,
        ),
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
        url: issueToUrl(
          item,
          siteIdentifier,
          language,
          version,
          config,
        ),
        is_last: index === feedJson._issues!.length - 1,
      };
    });
  }

  // add social links
  // @ts-ignore: add meta data
  feedJson._social_links = config.social_links;

  // @ts-ignore: new meta
  feedJson._site_identifier = siteIdentifier;
  // build index.html
  // @ts-ignore: js package does not have type for mustache
  const output = mustache.render(indexTemplateString, feedJson);
  // is dev
  if (!isDev()) {
    // pre-line conflict with css
    // return minifyHTML(output, {
    //   minifyCSS: true,
    //   minifyJS: true,
    // });
  }
  return output;
}
