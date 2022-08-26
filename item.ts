import {
  Author,
  Config,
  FeedItem,
  FeedItemKey,
  FormatedItem,
  Language,
  Link,
  ParsedFilename,
  Video,
} from "./interface.ts";
import {
  formatHumanTime,
  getCurrentTranslations,
  getDataFormatedPath,
  getDataRawPath,
  getDataTranslatedPath,
  getFullDay,
  getFullMonth,
  getFullYear,
  getItemTranslations,
  isMock,
  tagToUrl,
} from "./util.ts";
import { DOMParser, getMetadata, tweetPatch } from "./deps.ts";
import log from "./log.ts";
export default class Item<T> {
  originalItem: T;
  private now: Date = new Date();
  private image: string | null | undefined;

  constructor(originalItem: T) {
    this.originalItem = originalItem;
  }
  init(): Promise<void> {
    // after constructor,  you can do some async operations to init item
    // use by googlenews, for format id, cause google id is too long
    return Promise.resolve();
  }

  getItemIdentifier(): string {
    return `${this.getOriginalLanguage()}_${this.getType()}_${this.getPublishedYear()}_${this.getPublishedMonth()}_${this.getPublishedDay()}__${this.getId()}`;
  }
  getCachedKey(): string {
    return `${this.getOriginalLanguage()}_${this.getType()}__${this.getId()}`;
  }
  getOriginalLanguage(): string {
    return "en";
  }

  getSensitive(): boolean {
    return false;
  }

  getType(): string {
    return this.constructor.name;
  }
  getOriginalPublished(): string {
    return this.getOriginalPublishedDate().toISOString();
  }
  getOriginalPublishedDate(): Date {
    return new Date(0);
  }

  getOriginalPublishedYear(): string {
    return getFullYear(this.getOriginalPublishedDate());
  }
  getOriginalPublishedMonth(): string {
    return getFullMonth(this.getOriginalPublishedDate());
  }
  getOriginalPublishedDay(): string {
    return getFullDay(this.getOriginalPublishedDate());
  }
  getPublished(): string {
    return this.getPublishedDate().toISOString();
  }
  getPublishedDate(): Date {
    return this.now;
  }

  getPublishedYear(): string {
    return getFullYear(this.getPublishedDate());
  }
  getPublishedMonth(): string {
    return getFullMonth(this.getPublishedDate());
  }
  getPublishedDay(): string {
    return getFullDay(this.getPublishedDate());
  }
  getModifiedDate(): Date {
    return this.now;
  }
  getModified(): string {
    return this.getModifiedDate().toISOString();
  }
  getModifiedYear(): string {
    return getFullYear(this.getModifiedDate());
  }
  getModifiedMonth(): string {
    return getFullMonth(this.getModifiedDate());
  }
  getModifiedDay(): string {
    return getFullDay(this.getModifiedDate());
  }
  getId(): string {
    return "";
  }
  getTitle(): string {
    return "";
  }
  getTitlePrefix(): string {
    // this will not be translated
    return "";
  }
  getTitleSuffix(): string {
    // this will not be translated
    return "";
  }

  getUrl(): string {
    return "";
  }
  getSiteIdentifier(): string {
    return new URL(this.getUrl()).hostname;
  }
  getImage(): string | undefined | null {
    // undefined means not init
    // null means no image
    const url = this.getUrl();
    const urlObj = new URL(url);
    const domain = urlObj.hostname;
    const disableImages = [
      "www.githubstatus.com",
      "news.ycombinator.com",
      "github.com",
      "gist.github.com",
      "pypi.org",
    ];
    // ignore specific domain
    if (disableImages.includes(domain)) {
      return null;
    }
    return undefined;
  }
  async tryToLoadImage(): Promise<string | null> {
    if (isMock()) {
      this.image = null;
      return null;
    }
    const url = this.getUrl();
    // add siteIdentifier referrer
    log.debug(`try to load image for ${url}`);
    let resource: { text: string; contentType: string };
    try {
      resource = await fetch(url, {
        referrer: `https://www.google.com`,
      }).then(async (res) => {
        if (res.ok) {
          const contentType = res.headers.get("content-type");
          if (contentType && contentType.includes("text/html")) {
            const text = await res.text();
            return {
              text: text,
              contentType: contentType,
            };
          } else {
            throw new Error(
              `fetch ${url} failed, content type is not text/html, it is ${contentType}`,
            );
          }
        } else {
          throw new Error(`fetch ${url} failed`);
        }
      });
    } catch (e) {
      log.debug(e.message);
      this.image = null;
      return null;
    }
    try {
      const doc = new DOMParser().parseFromString(
        resource.text,
        "text/html",
      );
      const metadata = getMetadata(doc, url);
      if (metadata.image) {
        this.image = metadata.image;
        log.info(`found image ${this.image} for ${url}`);
        return metadata.image;
      } else {
        this.image = null;
      }
      return null;
    } catch (_e) {
      log.debug(`parse ${url} html failed`);
      log.debug(_e);
      this.image = null;
      return null;
    }
  }

  getAuthors(): Author[] {
    return [];
  }
  getLinks(): Link[] {
    return [];
  }

  getVideo(): Video | undefined {
    return undefined;
  }

  getRawPath(targetSiteIdentifiers: string[]): string {
    if (targetSiteIdentifiers.length === 0) {
      throw new Error("targetSiteIdentifiers can not be empty");
    }
    return `${getDataRawPath()}/${this.getModifiedYear()}/${this.getModifiedMonth()}/${this.getModifiedDay()}/${
      targetSiteIdentifiers.join("_")
    }/${this.getItemIdentifier()}.json`;
  }
  getRawItem(): T {
    return this.originalItem;
  }
  getScore(): number {
    return 0;
  }
  getWeightedScore(): number {
    return this.getNumComments() * 2 + this.getScore();
  }
  getNumComments(): number {
    return 0;
  }
  getFormatedPath(targetSiteIdentifiers: string[]): string {
    return `${getDataFormatedPath()}/${this.getModifiedYear()}/${this.getModifiedMonth()}/${this.getModifiedDay()}/${
      targetSiteIdentifiers.join("_")
    }/${this.getItemIdentifier()}.json`;
  }
  getTranslatedPath(targetSiteIdentifiers: string[]): string {
    return `${getDataTranslatedPath()}/${this.getModifiedYear()}/${this.getModifiedMonth()}/${this.getModifiedDay()}/${
      targetSiteIdentifiers.join("_")
    }/${this.getItemIdentifier()}.json`;
  }
  getExternalUrl(): string | undefined {
    return undefined;
  }
  getTranslation(): Record<string, string> {
    return {
      "title": this.getTitle(),
    };
  }
  getFullTranslations(): Record<string, Record<string, string>> | undefined {
    return undefined;
  }
  getFormatedItemSync(): FormatedItem {
    // this function will only format the original item
    // if you need the final formated item, please use getFeedItem()
    const externalUrl = this.getExternalUrl();
    let translations: Record<string, Record<string, string>> = {};

    if (this.getFullTranslations()) {
      translations = this.getFullTranslations()!;
    } else {
      translations[this.getOriginalLanguage()] = this.getTranslation();
    }
    const image = this.getImage();

    const item: FormatedItem = {
      id: this.getItemIdentifier(),
      url: this.getUrl(),
      date_published: this.getModified(),
      date_modified: this.getModified(),
      _original_published: this.getOriginalPublished(),
      _original_language: this.getOriginalLanguage(),
      _translations: translations,
    };

    const tags = this.getTags();
    if (tags && Array.isArray(tags) && tags.length > 0) {
      item.tags = tags;
    }
    const authors = this.getAuthors();
    if (authors && Array.isArray(authors) && authors.length > 0) {
      item.authors = authors;
    }
    if (this.getScore()) {
      item._score = this.getScore();
    }
    if (this.getNumComments()) {
      item._num_comments = this.getNumComments();
    }
    if (this.getTitlePrefix()) {
      item._title_prefix = this.getTitlePrefix();
    }
    if (this.getTitleSuffix()) {
      item._title_suffix = this.getTitleSuffix();
    }

    if (this.getSensitive()) {
      item._sensitive = true;
    }

    if (image) {
      item.image = image;
    }
    const video = this.getVideo();
    if (video) {
      item._video = video;
    }
    if (externalUrl) {
      item.external_url = externalUrl;
    }
    return item;
  }
  async getFormatedItem(): Promise<FormatedItem> {
    const formatedItem = this.getFormatedItemSync();
    if (this.getImage() === undefined) {
      await this.tryToLoadImage();
      if (this.image) {
        formatedItem.image = this.image;
      }
    }
    return formatedItem;
  }
  isText(): boolean {
    // title is text
    return false;
  }

  getFeedItemSync(
    siteIdentifier: string,
    language: Language,
    config: Config,
  ): FeedItem {
    const formatedItem = this.getFormatedItemSync();
    const item: FeedItem = {
      title: "",
      _title_html: "",
      summary: "",
      content_text: "",
      content_html: "",
      ...formatedItem,
    };
    if (this.isText()) {
      item._is_text = this.isText();
    }

    const itemUrl = this.getUrl();
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
      if (item[`_${translationField}_prefix` as FeedItemKey]) {
        translationValue = `${
          item[`_${translationField}_prefix` as FeedItemKey]
        }${translationValue}`;
      }
      // is has suffix
      if (item[`_${translationField}_suffix` as FeedItemKey]) {
        translationValue = `${translationValue}${
          item[`_${translationField}_suffix` as FeedItemKey]
        }`;
      }
      item[translationField as FeedItemKey] = translationValue as never;
    }

    if (this.getType() === "twitter") {
      // @ts-ignore: npm module
      item._title_html = tweetPatch(item.title);
    } else {
      item._title_html = item.title;
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
      content_html +=
        `<div><img class="u-photo" src="${item.image}" alt="image"></div>`;
    }
    content_html += ``;
    if (item._original_language !== language.code) {
      let finalTitle = originalTranslationObj.title;
      if (this.getType() === "twitter") {
        // @ts-ignore: npm modules
        finalTitle = tweetPatch(
          originalTranslationObj.title,
        );
      }
      content_html +=
        `<div>${finalTitle} (<a href="${itemUrl}">${itemUrlObj.hostname}</a>)</div>`;
      summary += `${
        formatHumanTime(
          new Date(item._original_published as string),
        )
      } - ${originalTranslationObj.title}`;
    }
    content_html +=
      `<footer><a href="${itemUrl}"><time class="dt-published published" datetime="${item._original_published}">${
        formatHumanTime(
          new Date(item._original_published as string),
        )
      }</time></a>&nbsp;&nbsp;`;

    let index = 0;
    const currentTranslations = getCurrentTranslations(
      siteIdentifier,
      language.code,
      config,
    );
    // add links
    if (this.getLinks().length > 0) {
      for (const link of this.getLinks()) {
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
    content_html += "</footer>";

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

    return item;
  }
  getTags(): string[] {
    return [];
  }
}
