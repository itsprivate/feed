import { Author, Link, Video, VideoSource } from "../interface.ts";
import Item from "../item.ts";

import log from "../log.ts";
import { sha1 } from "../util.ts";

export default class reddit extends Item<NewsItem> {
  private id: string = super.getId();
  private url: string = super.getUrl();
  // @ts-ignore: unused
  constructor(...args) {
    // @ts-ignore: unused
    super(...args);
    this.url = this.originalItem.link;
  }
  getOriginalPublishedDate(): Date {
    return new Date(this.originalItem.original_created_at);
  }
  async beforeFormatInit(): Promise<void> {
    // get title unique
    await super.beforeFormatInit();
    // default id
    const title = this.originalItem.title;
    let id = this.originalItem.id;
    if (id.length > 32) {
      id = await sha1(title);
      this.id = id;
    }
    // init to get the real url
    const fetchResult = await fetch(this.getUrl(), {
      redirect: "manual",
    });
    log.debug(`google news fetch result: `, super.getUrl(), fetchResult.status);
    if (
      (fetchResult.status === 301 || fetchResult.status === 302) &&
      fetchResult.headers.get("location")
    ) {
      this.url = fetchResult.headers.get("location")!;

      this.id = await sha1(this.url);
    }
  }
  getId(): string {
    return this.id;
  }
  getUrl(): string {
    return this.url;
  }
  getTags(): string[] {
    const titleSuffix = this.getTitleSuffix();
    if (titleSuffix.length > 0) {
      if (titleSuffix.startsWith(" - ")) {
        return [titleSuffix.slice(3)];
      }
    }

    return [];
  }
  getTitleSuffix(): string {
    const source = this.originalItem.source;
    if (source.length > 0) {
      return ` - ${source}`;
    } else {
      return "";
    }
  }
  getTitle(): string {
    return this.originalItem.title;
  }
  getImage(): string | null | undefined {
    if (this.originalItem.image) {
      return this.originalItem.image;
    } else {
      return null;
    }
  }
  getFullTranslations(): Record<string, Record<string, string>> {
    const translations: Record<string, Record<string, string>> = {
      "en": {
        title: this.getTitle(),
      },
    };
    if (this.originalItem.localize) {
      for (const locale of this.originalItem.localize) {
        let languageCode = locale.locale;
        if (languageCode === "zh") {
          languageCode = "zh-Hans";
        }
        if (!locale.title) {
          throw new Error("no title " + this.getId());
        }
        translations[languageCode] = {
          "title": locale.title,
        };
      }
    } else {
      log.info("no locale", this.getId());
    }

    return translations;
  }

  getPublishedDate(): Date {
    return new Date(this.originalItem.created_at);
  }
  getModifiedDate(): Date {
    return new Date(this.originalItem.created_at);
  }
  getLinks(): Link[] {
    return [];
  }
}
export interface NewsItem {
  title: string;
  link: string;
  pubDate: string;
  source: string;
  content: string;
  contentSnippet: string;
  guid: string;
  isoDate: string;
  original_created_at: string;
  created_at: string;
  original_guid: string;
  id: string;
  tags: string[];
  image: string;
  localize: Localize[];
}

export interface Localize {
  locale: string;
  title: string;
}
