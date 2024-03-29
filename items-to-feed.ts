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
  archiveToTitle,
  formatHumanTime,
  formatIsoDate,
  getCurrentTranslations,
  getItemTranslations,
  getPageMeta,
  getSourceLinks,
  itemsPathToURLPath,
  siteIdentifierToUrl,
} from "./util.ts";
import SourceItemAdapter from "./adapters/source.ts";
import Item from "./item.ts";
import log from "./log.ts";
import { archiveSubDomain } from "./constant.ts";
export default function itemsToFeed(
  pageRelativePathname: string,
  currentItemsJson: ItemsJson,
  siteIdentifier: string,
  languageCode: string,
  config: Config,
  options?: ItemsToFeedOptions,
): Feedjson {
  const siteConfig: GeneralSiteConfig = config.sites[siteIdentifier];

  //check if need to archive items
  const currentItemsJsonKeys = Object.keys(
    currentItemsJson.items,
  );
  const language = config.languages.find((lang) => lang.code === languageCode);
  let versionCode = "default";
  if (options && options.versionCode) {
    versionCode = options.versionCode;
  }
  let isPost = false;
  if (options && options.isPost) {
    isPost = options.isPost;
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
      const aModified = currentItemsJson.items[a].date_published!;
      const bModified = currentItemsJson.items[b].date_published!;

      return new Date(bModified).getTime() - new Date(aModified).getTime();
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
  const hostpageIdentifier = options?.isArchive
    ? archiveSubDomain
    : siteIdentifier;

  let siteName = `${currentTranslations.title}`;
  let siteTitleSuffix = "";
  if (version.code !== "default") {
    siteName = `${currentTranslations.title} ${version.name}`;
  }
  let siteTitle = "";
  let siteDescription = currentTranslations.description;
  let pageTitle = "";

  if (options?.isArchive) {
    let longestTitle = "";
    // find first title, if any
    if (items.length > 0) {
      longestTitle = items[0].title;
      for (let i = 1; i < items.length; i++) {
        if (items[i].title.length > longestTitle.length) {
          longestTitle = items[i].title;
        }
      }
    }
    const pageMeta = getPageMeta(pageRelativePathname);
    if (pageMeta.type === "tag") {
      const tagName = currentItemsJson.meta?.name;
      if (tagName) {
        siteTitle = `#${tagName}`;
        pageTitle = `#${tagName}`;
      } else {
        siteTitle = `#${pageMeta.meta.tagIdentifier}`;
        pageTitle = `#${pageMeta.meta.tagIdentifier}`;
      }
      siteTitleSuffix = ` - ${siteName}`;
      if (longestTitle) {
        siteDescription = longestTitle;
      }
    } else if (pageMeta.type === "index") {
      siteTitle = `${siteName}`;
      siteTitleSuffix = ` - ${siteDescription}`;
    } else if (pageMeta.type === "issues") {
      pageTitle = archiveToTitle(
        `${pageMeta.meta.year}/${pageMeta.meta.week}`,
        currentTranslations.issue_title_label,
      );
      siteTitle = `${pageTitle}`;
      siteTitleSuffix = ` - ${siteName}`;
      if (longestTitle) {
        siteDescription = longestTitle;
      }
    } else if (pageMeta.type === "archive") {
      pageTitle = archiveToTitle(
        `${pageMeta.meta.year}/${pageMeta.meta.week}`,
        currentTranslations.archive_title_label,
      );
      siteTitle = `${pageTitle}`;
      siteTitleSuffix = ` - ${siteName}`;
      if (longestTitle) {
        siteDescription = longestTitle;
      }
    } else if (pageMeta.type === "posts") {
      if (items.length > 0) {
        siteTitle = `${items[0].title ?? ""}`;
        siteDescription = items[0].summary || siteDescription;
        siteTitleSuffix = ` - ${siteName}`;
      }
    }
  } else {
    // index
    siteTitle = `${siteTitle}`;
    siteTitleSuffix = ` - ${siteDescription}`;
  }
  if (!siteTitle) {
    siteTitle = siteName;
  }

  const feedJson: Feedjson = {
    "version": "https://jsonfeed.org/version/1",
    "title": siteTitle,
    "description": siteDescription,
    "icon": siteIdentifierToUrl(siteIdentifier, "/icon.png", config),
    "_apple_touch_icon": siteIdentifierToUrl(
      siteIdentifier,
      "/apple-touch-icon.png",
      config,
    ),
    "_latest_build_time": formatIsoDate(new Date()),
    "favicon": siteIdentifierToUrl(siteIdentifier, "/favicon.ico", config),
    "language": language.code,
    "_site_version": version.code,
    "home_page_url": siteIdentifierToUrl(
      hostpageIdentifier,
      "/" + language.prefix + version.prefix + pageRelativePathname.slice(1),
      config,
    ),
    "feed_url": siteIdentifierToUrl(
      hostpageIdentifier,
      `/${language.prefix}${version.prefix}${
        pageRelativePathname.slice(1)
      }feed.json`,
      config,
    ),
    _sources: getSourceLinks(siteIdentifier, config),
    items,
  };
  if (siteTitleSuffix) {
    // @ts-ignore: add meta
    feedJson._title_suffix = siteTitleSuffix;
  }
  // find images, if any
  if (items.length > 0) {
    const imageItem = items.find((item) => item.image);
    if (imageItem) {
      // @ts-ignore: add meta
      feedJson._image = imageItem.image;
    }
  }
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
  if (pageTitle) {
    // @ts-ignore: add meta
    feedJson._page_title = pageTitle;
  }
  return feedJson;
}
