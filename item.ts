import {
  Author,
  FormatedItem,
  Link,
  ParsedFilename,
  Video,
} from "./interface.ts";
import {
  getDataFormatedPath,
  getDataRawPath,
  getDataTranslatedPath,
  getFullDay,
  getFullMonth,
  getFullYear,
  isMock,
  siteIdentifierToPath,
} from "./util.ts";
import { DOMParser, getMetadata } from "./deps.ts";
import log from "./log.ts";
export default class Item<T> {
  originalItem: T;
  private now: Date = new Date();
  private image: string | null | undefined;
  static parseItemIdentifier(
    fileBasename: string,
  ): ParsedFilename {
    // remove extension
    let filename = fileBasename;
    if (filename.endsWith(".json")) {
      filename = filename.slice(0, -5);
    }
    const parts = filename.split("__");
    // first will be safe part, other will be the id parts
    const safePart = parts[0];
    const symParts = safePart.split("_");
    const language = symParts[0];
    const type = symParts[1];

    const idParts = parts.slice(1);
    const id = idParts.join("__");
    return {
      id,
      language,
      type,
    };
  }

  constructor(originalItem: T) {
    this.originalItem = originalItem;
  }

  init(): Promise<void> {
    // after constructor,  you can do some async operations to init item
    // use by googlenews, for format id, cause google id is too long
    return Promise.resolve();
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

  getItemIdentifier(): string {
    return `${this.getLanguage()}_${this.getType()}__${this.getId()}`;
  }
  getLanguage(): string {
    return "en";
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
  getTranslations(): Record<string, string> {
    return {
      "title": this.getTitle(),
    };
  }
  getFullTranslations(): Record<string, Record<string, string>> | undefined {
    return undefined;
  }
  async getFormatedItem(): Promise<FormatedItem> {
    const externalUrl = this.getExternalUrl();
    let translations: Record<string, Record<string, string>> = {};

    if (this.getFullTranslations()) {
      translations = this.getFullTranslations()!;
    } else {
      translations[this.getLanguage()] = this.getTranslations();
    }
    let image = this.getImage();
    if (image === undefined) {
      await this.tryToLoadImage();
      image = this.image;
    }
    const item: FormatedItem = {
      id: this.getItemIdentifier(),
      url: this.getUrl(),
      date_published: this.getModified(),
      date_modified: this.getModified(),
      _original_published: this.getOriginalPublished(),
      _original_language: this.getLanguage(),
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
  getTags(): string[] {
    return [];
  }
}
