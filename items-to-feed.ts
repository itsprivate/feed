import { Config, FeedItem, Feedjson, FormatedItem } from "./interface.ts";
import { formatHumanTime, getCurrentTranslations } from "./util.ts";
import { ARCHIVE_SITE_PREFIX, TARGET_SITE_LANGUAEGS } from "./constant.ts";
import { slug } from "./deps.ts";
export default function itemsToFeed(
  currentItemsJson: Record<string, FormatedItem>,
  domain: string,
  languageCode: string,
  config: Config,
): Feedjson {
  //check if need to archive items
  const currentItemsJsonKeys = Object.keys(
    currentItemsJson,
  );
  const language = TARGET_SITE_LANGUAEGS.find((lang) =>
    lang.code === languageCode
  );
  if (!language) {
    throw new Error(`language code ${languageCode} not found`);
  }
  const currentItemsJsonKeysSorted = currentItemsJsonKeys
    .sort((a, b) => {
      const aModified = currentItemsJson[a]["date_modified"]!;
      const bModified = currentItemsJson[b]["date_modified"]!;
      return new Date(aModified) > new Date(bModified) ? -1 : 1;
    });

  const currentTranslations = getCurrentTranslations(
    domain,
    language.code,
    config,
  );

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

  const items: FeedItem[] = [];
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

    // add tags
    if (item.tags && Array.isArray(item.tags)) {
      for (const tag of item.tags) {
        summary += ` #${tag}`;
        content_html +=
          ` <a href="${ARCHIVE_SITE_PREFIX}/${language.prefix}${domain}/tags/${
            // @ts-ignore: npm module
            slug(tag)}">#${tag}</a>`;
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
  const feedJson: Feedjson = {
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
  return feedJson;
}
