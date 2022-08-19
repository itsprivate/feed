import {
  Config,
  FeedItem,
  Feedjson,
  FormatedItem,
  GeneralSiteConfig,
  ItemsJson,
  ItemsToFeedOptions,
} from "./interface.ts";
import {
  formatHumanTime,
  getCurrentTagsFilePath,
  getCurrentTranslations,
  getItemTranslations,
  getPageMeta,
  itemsPathToURLPath,
  readJSONFile,
  siteIdentifierToUrl,
} from "./util.ts";
import log from "./log.ts";
import { ARCHIVE_SITE_PREFIX, TARGET_SITE_LANGUAEGS } from "./constant.ts";
import { slug } from "./deps.ts";
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
  if (!language) {
    throw new Error(`language code ${languageCode} not found`);
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
    const item = currentItemsJson.items[key] as FormatedItem;
    const itemUrl = item["url"];
    const itemUrlObj = new URL(itemUrl);
    const translationObj = getItemTranslations(
      item._translations,
      language.code,
    );

    const translationFields = Object.keys(translationObj);
    for (const translationField of translationFields) {
      const translationValue = translationObj[translationField];
      item[translationField] = translationValue;
    }

    let summary = "";

    let content_html = "";
    if (item.image) {
      content_html += `<img class="u-photo" src="${item.image}" alt="image">`;
    }
    content_html +=
      ` <time class="dt-published published" datetime="${item.date_published}">${
        formatHumanTime(
          new Date(item.date_published as string),
        )
      }</time> -`;
    content_html +=
      ` ${item.title} (<a href="${itemUrlObj.protocol}//${itemUrlObj.hostname}">${itemUrlObj.hostname}</a>)<br>`;

    // add links
    let index = 0;
    for (const link of item._links) {
      const isGreaterFirst = index >= 1;
      const linkName = currentTranslations[link.name] ??
        link.name;
      summary += `${linkName}: ${link.url}\n`;
      content_html += `${
        isGreaterFirst ? "&nbsp;&nbsp;" : ""
      }<a href="${link.url}">${linkName}</a>`;
      index++;
    }
    // add tags
    if (item.tags && Array.isArray(item.tags)) {
      for (const tag of item.tags) {
        const isGreaterFirst = index >= 1;
        summary += ` #${tag}`;
        content_html += `${
          isGreaterFirst ? "&nbsp;&nbsp;" : ""
        }<a href="${ARCHIVE_SITE_PREFIX}/${language.prefix}${siteIdentifier}/tags/${
          // @ts-ignore: npm module
          slug(tag)}">#${tag}</a>`;
        index++;
      }
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
    items.push(item as FeedItem);
  });
  const homepageIdentifier = options?.isArchive
    ? config.archive.siteIdentifier
    : siteIdentifier;

  let siteTitle = currentTranslations.title;
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
    "icon": siteIdentifierToUrl(homepageIdentifier, "/icon.png", config),
    "favicon": siteIdentifierToUrl(
      homepageIdentifier,
      "/favicon.ico",
      config,
    ),
    "language": language.code,
    "home_page_url": siteIdentifierToUrl(
      homepageIdentifier,
      "/" + language.prefix + homePageRelativePath,
      config,
    ),
    "feed_url": siteIdentifierToUrl(
      homepageIdentifier,
      `/${language.prefix}${feedUrlRelativePath}`,
      config,
    ),
    items,
    _tags: siteConfig.tags,
  };
  return feedJson;
}
