import {
  Config,
  FeedItem,
  FeedItemKey,
  Feedjson,
  GeneralSiteConfig,
  GetFeedItemSyncOptions,
  ItemKey,
  ItemsJson,
  ItemsToFeedOptions,
} from "./interface.ts";
import {
  formatHumanTime,
  getCurrentTranslations,
  getItemTranslations,
  getPageMeta,
  itemsPathToURLPath,
  siteIdentifierToUrl,
  tagToUrl,
} from "./util.ts";
import SourceItemAdapter from "./adapters/source.ts";
import Item from "./item.ts";
import log from "./log.ts";
import { TARGET_SITE_LANGUAEGS } from "./constant.ts";
export default function itemsToFeed(
  relativePath: string,
  currentItemsJson: ItemsJson,
  siteIdentifier: string,
  languageCode: string,
  config: Config,
  options?: ItemsToFeedOptions,
): Feedjson {
  let siteConfig: GeneralSiteConfig;
  if (siteIdentifier === config.archive.siteIdentifier) {
    siteConfig = config.archive;
  } else {
    siteConfig = config.sites[siteIdentifier];
  }
  //check if need to archive items
  const currentItemsJsonKeys = Object.keys(
    currentItemsJson.items,
  );
  const language = TARGET_SITE_LANGUAEGS.find((lang) =>
    lang.code === languageCode
  );

  let versionCode = "default";
  if (options && options.versionCode) {
    versionCode = options.versionCode;
  }
  const version = config.versions.find((v) => v.code === versionCode);

  if (!language) {
    throw new Error(`language code ${languageCode} not found`);
  }
  if (!version) {
    throw new Error(`version code ${versionCode} not found`);
  }
  const currentItemsJsonKeysSorted = currentItemsJsonKeys
    .sort((a, b) => {
      const aModified = currentItemsJson.items[a]["date_published"]!;
      const bModified = currentItemsJson.items[b]["date_published"]!;
      return new Date(aModified) > new Date(bModified) ? -1 : 1;
    });
  const currentTranslations = getCurrentTranslations(
    siteIdentifier,
    language.code,
    config,
  );

  // check config
  if (!currentTranslations.title) {
    throw new Error(
      `${siteIdentifier} config missing title for language ${language.code}`,
    );
  }
  // check description
  if (!currentTranslations.description) {
    throw new Error(
      `${siteIdentifier} config missing description for language ${language.code}`,
    );
  }

  const items: FeedItem[] = [];
  currentItemsJsonKeysSorted.forEach((key) => {
    const originalItem = currentItemsJson.items[key];

    // parse key to get id, type
    const itemInstance = new SourceItemAdapter(
      originalItem,
    );
    try {
      const getFeedItemSyncOptions: GetFeedItemSyncOptions = { versionCode };

      const feedItem = itemInstance.getFeedItemSync(
        siteIdentifier,
        language,
        config,
        getFeedItemSyncOptions,
      );

      items.push(feedItem);
    } catch (_e) {
      // ignore
      log.debug(`ignore item ${key}`);
    }
  });
  const homepageIdentifier = options?.isArchive
    ? config.archive.siteIdentifier
    : siteIdentifier;

  let siteTitle = `${currentTranslations.title}`;
  if (version.code !== "default") {
    siteTitle = `${currentTranslations.title} - ${version.name}`;
  }
  if (options?.isArchive) {
    const pageMeta = getPageMeta(relativePath);
    if (pageMeta.type === "tag") {
      const tagName = currentItemsJson.meta?.name;
      if (tagName) {
        siteTitle = `${siteTitle} · #${tagName}`;
      } else {
        siteTitle = `${siteTitle} · #${pageMeta.meta.tagIdentifier}`;
      }
    }
  }
  let homePageRelativePath = itemsPathToURLPath(relativePath).slice(1);
  let feedUrlRelativePath = `${itemsPathToURLPath(relativePath)}feed.json`
    .slice(1);
  if (options?.isArchive) {
    homePageRelativePath = `${siteIdentifier}/${homePageRelativePath}`;
    feedUrlRelativePath = `${siteIdentifier}/${feedUrlRelativePath}`;
  }
  const feedJson: Feedjson = {
    "version": "https://jsonfeed.org/version/1",
    "title": siteTitle,
    "description": currentTranslations.description,
    "icon": config.icon,
    "favicon": config.favicon,
    "language": language.code,
    "_site_version": version.code,
    "home_page_url": siteIdentifierToUrl(
      homepageIdentifier,
      "/" + language.prefix + version.prefix + homePageRelativePath,
      config,
    ),
    "feed_url": siteIdentifierToUrl(
      homepageIdentifier,
      `/${language.prefix}${version.prefix}${feedUrlRelativePath}`,
      config,
    ),
    items,
  };
  if (siteConfig.tags) {
    feedJson._site_tags = siteConfig.tags;
  }
  if (currentItemsJson.tags) {
    feedJson._tags = currentItemsJson.tags;
  }
  if (currentItemsJson.archive) {
    feedJson._archive = currentItemsJson.archive;
  }
  if (currentItemsJson.issues) {
    feedJson._issues = currentItemsJson.issues;
  }
  return feedJson;
}
