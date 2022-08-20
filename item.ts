import { Author, FormatedItem, Link, ParsedFilename } from "./interface.ts";
import {
  getDataFormatedPath,
  getDataRawPath,
  getDataTranslatedPath,
  getFullDay,
  getFullMonth,
  getFullYear,
  isMock,
  isMockImage,
  siteIdentifierToDomain,
  siteIdentifierToPath,
} from "./util.ts";
import { DOMParser, getMetadata } from "./deps.ts";
import log from "./log.ts";
export default class Item {
  originalItem: Record<string, unknown>;
  private siteIdentifier: string;
  private now: Date = new Date();
  private image: string | null | undefined;
  static parseItemIdentifier(fileBasename: string): ParsedFilename {
    // remove extension
    let filename = fileBasename;
    if (filename.endsWith(".json")) {
      filename = filename.slice(0, -5);
    }
    const parts = filename.split("__");
    // first will be safe part, other will be the id parts
    const safePart = parts[0];
    const symParts = safePart.split("_");
    const year = symParts[0];
    const month = symParts[1];
    const day = symParts[2];
    const language = symParts[3];
    const type = symParts[4];
    const targetSiteIdentifier = symParts[5];
    const targetSite = siteIdentifierToDomain(targetSiteIdentifier);
    const idParts = parts.slice(1);
    const id = idParts.join("__");
    return {
      id,
      year,
      month,
      day,
      language,
      type,
      targetSite,
      targetSiteIdentifier,
    };
  }
  static getTranslatedPath(filename: string): string {
    const parsed = Item.parseItemIdentifier(filename);
    const now = new Date();
    return `${getDataTranslatedPath()}/${parsed.targetSiteIdentifier}/${
      getFullYear(now)
    }/${getFullMonth(now)}/${getFullDay(now)}/${filename}`;
  }

  constructor(originalItem: Record<string, unknown>, siteIdentifier: string) {
    this.originalItem = originalItem;
    this.siteIdentifier = siteIdentifier;
  }
  getTargetSite(): string {
    return siteIdentifierToDomain(this.siteIdentifier);
  }
  getTargetSitePath(): string {
    return siteIdentifierToPath(this.siteIdentifier);
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
    if (isMock() && isMockImage()) {
      this.image = null;
      return null;
    }
    const url = this.getUrl();
    // add siteIdentifier referrer
    const targetSite = this.getTargetSite();
    log.debug(`try to load image for ${url}`);
    let resource: { text: string; contentType: string };
    try {
      resource = await fetch(url, {
        referrer: `https://${targetSite}`,
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
  getLinks(): Link[] {
    return [];
  }
  getAuthors(): Author[] {
    return [];
  }
  getItemIdentifier(): string {
    return `${this.getOriginalPublishedYear()}_${this.getOriginalPublishedMonth()}_${this.getOriginalPublishedDay()}_${this.getLanguage()}_${this.getType()}_${this.getTargetSitePath()}__${this.getId()}`;
  }
  getLanguage(): string {
    return "en";
  }
  getRawPath(): string {
    return `${getDataRawPath()}/${(this
      .getTargetSitePath())}/${this.getModifiedYear()}/${this.getModifiedMonth()}/${this.getModifiedDay()}/${this.getItemIdentifier()}.json`;
  }
  getFormatedPath(): string {
    return `${getDataFormatedPath()}/${(this
      .getTargetSitePath())}/${this.getModifiedYear()}/${this.getModifiedMonth()}/${this.getModifiedDay()}/${this.getItemIdentifier()}.json`;
  }
  getExternalUrl(): string | undefined {
    return undefined;
  }
  getTranslations(): Record<string, string> {
    return {
      "title": this.getTitle(),
    };
  }
  async getFormatedItem(): Promise<FormatedItem> {
    const externalUrl = this.getExternalUrl();
    const translations: Record<string, Record<string, string>> = {};
    translations[this.getLanguage()] = this.getTranslations();
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
      tags: this.getTags(),
      authors: this.getAuthors(),
      _original_published: this.getOriginalPublished(),
      _original_language: this.getLanguage(),
      _links: this.getLinks(),
      _translations: translations,
    };
    if (image) {
      item.image = image;
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
