import { Config, FeedItem, Feedjson, FormatedItem } from "./interface.ts";
import {
  formatHumanTime,
  getCurrentTranslations,
  getItemTranslations,
  siteIdentifierToUrl,
} from "./util.ts";
import { ARCHIVE_SITE_PREFIX, TARGET_SITE_LANGUAEGS } from "./constant.ts";
import { slug } from "./deps.ts";
export default function itemsToFeed(
  currentItemsJson: Record<string, FormatedItem>,
  siteIdentifier: string,
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
      const aModified = currentItemsJson[a]["date_published"]!;
      const bModified = currentItemsJson[b]["date_published"]!;
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
    const item = currentItemsJson[key] as FormatedItem;
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

    // content_html +=
    //   '<blockquote class="twitter-tweet"><p lang="en" dir="ltr">Sunsets don&#39;t get much better than this one over <a href="https://twitter.com/GrandTetonNPS?ref_src=twsrc%5Etfw">@GrandTetonNPS</a>. <a href="https://twitter.com/hashtag/nature?src=hash&amp;ref_src=twsrc%5Etfw">#nature</a> <a href="https://twitter.com/hashtag/sunset?src=hash&amp;ref_src=twsrc%5Etfw">#sunset</a> <a href="http://t.co/YuKy2rcjyU">pic.twitter.com/YuKy2rcjyU</a></p>&mdash; US Department of the Interior (@Interior) <a href="https://twitter.com/Interior/status/463440424141459456?ref_src=twsrc%5Etfw">May 5, 2014</a></blockquote> ';
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
    "icon": siteIdentifierToUrl(siteIdentifier, "/icon.png", config),
    "favicon": siteIdentifierToUrl(siteIdentifier, "/favicon.ico", config),
    "language": language.code,
    "home_page_url": siteIdentifierToUrl(
      siteIdentifier,
      "/" + language.prefix,
      config,
    ),
    "feed_url": siteIdentifierToUrl(
      siteIdentifier,
      `/${language.prefix}feed.json`,
      config,
    ),
    items,
  };
  return feedJson;
}
