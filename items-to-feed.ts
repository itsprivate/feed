import {
  Config,
  FeedItem,
  FeedItemKey,
  Feedjson,
  GeneralSiteConfig,
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
    const originalItem = currentItemsJson.items[key];
    const item: FeedItem = {
      title: "",
      summary: "",
      content_text: "",
      content_html: "",
      ...originalItem,
    };
    // parse key to get id, type
    const parsedIdentifier = Item.parseItemIdentifier(key);
    const itemInstance = new SourceItemAdapter(
      item,
      parsedIdentifier.targetSiteIdentifier,
    );
    const itemUrl = itemInstance.getUrl();
    const itemUrlObj = new URL(itemUrl);
    const translationObj = getItemTranslations(
      item._translations || {},
      language.code,
      item._original_language,
    );

    const originalTranslationObj = getItemTranslations(
      item._translations || {},
      item._original_language,
      item._original_language,
    );

    const translationFields = Object.keys(translationObj);
    for (const translationField of translationFields) {
      let translationValue = translationObj[translationField];
      // is has prefix
      if (item[`_${translationField}_prefix` as ItemKey]) {
        translationValue = `${
          item[`_${translationField}_prefix` as ItemKey]
        }${translationValue}`;
      }
      // is has suffix
      if (item[`_${translationField}_suffix` as ItemKey]) {
        translationValue = `${translationValue}${
          item[`_${translationField}_suffix` as ItemKey]
        }`;
      }
      item.title = "1";
      item[translationField as FeedItemKey] = translationValue as never;
    }

    let summary = "";

    let content_html = "";
    if (item._video) {
      const sources = item._video.sources;
      const height = item._video.height;
      const width = item._video.width;
      const poster = item._video.poster;
      content_html = `<video playsinline controls preload="none"`;
      if (width) {
        content_html += ` width="${width}"`;
      }
      if (height) {
        content_html += ` height="${height}"`;
      }
      if (poster) {
        content_html += ` poster="${poster}"`;
      }

      content_html += `>`;
      for (const source of sources) {
        content_html += `<source src="${source.url}"`;
        if (source.type) {
          content_html += ` type="${source.type}"`;
        }
        content_html += `>`;
      }
      content_html += "your browser does not support the video tag.</video>";
    } else if (item.image) {
      content_html += `<img class="u-photo" src="${item.image}" alt="image">`;
    }
    content_html += `<div>`;
    if (item._original_language !== language.code) {
      content_html +=
        ` ${originalTranslationObj.title} (<a href="${itemUrlObj.protocol}//${itemUrlObj.hostname}">${itemUrlObj.hostname}</a>)`;
      summary += `${
        formatHumanTime(
          new Date(item._original_published as string),
        )
      } - ${originalTranslationObj.title}`;
    }
    content_html +=
      `<p><cite><a href="${itemUrl}"><time class="dt-published published" datetime="${item._original_published}">${
        formatHumanTime(
          new Date(item._original_published as string),
        )
      }</time></a>&nbsp;&nbsp;`;

    let index = 0;

    // add links
    if (itemInstance.getLinks().length > 0) {
      for (const link of itemInstance.getLinks()) {
        const isGreaterFirst = index >= 1;
        const linkName = currentTranslations[link.name] ??
          link.name;
        summary += `${linkName}: ${link.url}\n`;
        content_html += `${
          isGreaterFirst ? "&nbsp;&nbsp;" : ""
        }<a href="${link.url}">${linkName}</a>`;
        index++;
      }
    }

    // add tags
    if (item.tags && Array.isArray(item.tags)) {
      for (const tag of item.tags) {
        const isGreaterFirst = index >= 1;
        summary += ` #${tag}`;
        content_html += `${isGreaterFirst ? "&nbsp;&nbsp;" : ""}<a href="${
          tagToUrl(tag, siteIdentifier, language, config)
        }">#${tag}</a>`;
        index++;
      }
    }
    content_html += "</cite></p></div>";

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
    "icon": config.icon,
    "favicon": config.favicon,
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
