import { Author, FormatedItem, Link, ParsedFilename } from "./interface.ts";
import {
  getDataFormatedPath,
  getDataRawPath,
  getDataTranslatedPath,
  getDistPath,
  getFullDay,
  getFullMonth,
  getFullYear,
} from "./util.ts";
export default class Item {
  originalItem: Record<string, unknown>;
  private targetSite: string;
  static parseFilename(fileBasename: string): ParsedFilename {
    // remove extension
    const filename = fileBasename.replace(/\.[^/.]+$/, "");
    const parts = filename.split("_");
    // first will be safe part, other will be the id parts
    const safePart = parts[0];
    const symParts = safePart.split("-");
    const year = symParts[0];
    const month = symParts[1];
    const day = symParts[2];
    const language = symParts[3];
    const type = symParts[4];
    const targetSite = symParts[5];

    const idParts = parts.slice(1);
    const id = idParts.join("");
    return {
      id,
      year,
      month,
      day,
      language,
      type,
      targetSite,
    };
  }
  static getTranslatedPath(filename: string): string {
    const parsed = Item.parseFilename(filename);
    const now = new Date();
    return `${getDataTranslatedPath()}/${parsed.targetSite}/${
      getFullYear(now)
    }/${getFullMonth(now)}/${getFullDay(now)}/${filename}`;
  }
  constructor(originalItem: Record<string, unknown>, targetSite: string) {
    this.originalItem = originalItem;
    this.targetSite = targetSite;
  }
  getTargetSite(): string {
    return this.targetSite;
  }
  getType(): string {
    return this.constructor.name;
  }
  getPublished(): string {
    return this.getPublishedDate().toISOString();
  }
  getPublishedDate(): Date {
    return new Date(0);
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
    return new Date();
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
  getDomain(): string {
    return new URL(this.getUrl()).hostname;
  }
  getImage(): string | undefined {
    return undefined;
  }
  getLinks(): Link[] {
    return [];
  }
  getAuthors(): Author[] {
    return [];
  }
  getFilename(): string {
    return `${this.getPublishedYear()}-${this.getPublishedMonth()}-${this.getPublishedDay()}-${this.getLanguage()}-${this.getType()}-${this.getTargetSite()}_${this.getId()}`;
  }
  getLanguage(): string {
    return "en";
  }
  getRawPath(): string {
    return `${getDataRawPath()}/${this.getTargetSite()}/${this.getModifiedYear()}/${this.getModifiedMonth()}/${this.getModifiedDay()}/${this.getFilename()}.json`;
  }
  getFormatedPath(): string {
    return `${getDataFormatedPath()}/${this.getTargetSite()}/${this.getModifiedYear()}/${this.getModifiedMonth()}/${this.getModifiedDay()}/${this.getFilename()}.json`;
  }
  getFormatedItem(): FormatedItem {
    const titleField = `_title_${this.getLanguage()}`;
    return {
      id: this.getFilename(),
      [titleField]: this.getTitle(),
      image: this.getImage(),
      url: this.getUrl(),
      date_published: this.getPublished(),
      date_modified: this.getModified(),
      _original_language: this.getLanguage(),
      tags: this.getTags(),
      authors: this.getAuthors(),
      _links: this.getLinks(),
    };
  }
  getTags(): string[] {
    return [];
  }
}
