import { Author } from "../interface.ts";
import Item from "../item.ts";
import { formatId } from "../util.ts";
export default class rss extends Item<RSSItem> {
  getOriginalPublishedDate(): Date {
    return new Date(this.originalItem.published as string);
  }
  getId(): string {
    let id = this.originalItem.id as string;
    const formatedId = formatId(id);
    return formatedId;
  }
  getTitle(): string {
    const title = this.originalItem.title.value as string;

    return title;
  }
  getTitlePrefix(): string {
    return "";
  }

  getImage(): string | null | undefined {
    const url = this.getUrl();
    const urlObj = new URL(url);
    const hostname = urlObj.hostname;
    // sky news image is too small
    if (hostname === "news.sky.com") {
      return undefined;
    }
    if (
      this.originalItem["media:content"] &&
      this.originalItem["media:content"].length > 0
    ) {
      return this
        .originalItem["media:content"][
          this.originalItem["media:content"].length - 1
        ].url;
    } else {
      return undefined;
    }
  }
  getUrl(): string {
    if (this.originalItem.links) {
      return this.originalItem.links[0].href;
    } else {
      return "";
    }
  }

  getAuthors(): Author[] {
    return [];
  }

  getTags(): string[] {
    let tags: string[] = [];

    if (
      this.originalItem.categories &&
      Array.isArray(this.originalItem.categories)
    ) {
      this.originalItem.categories.forEach((item) => {
        tags.push(item.label);
      });
    }
    // unique
    tags = [...new Set(tags)];
    return tags;
  }
}
export interface RSSItem {
  "media:content": MediaContent[];
  "media:keywords": string;
  "dc:creator": string[];
  "dc:publisher": string;
  "media:thumbnail": MediaThumbnail;
  source: Source;
  id: string;
  title: Description;
  description: Description;
  published: string;
  publishedRaw: string;
  updated: string;
  updatedRaw: string;
  comments?: string;
  author: Author;
  links: Link2[];
  _id?: string;
  _url?: string;
  categories: Category[];
}

export interface Description {
  value: string;
}

export interface Link2 {
  href: string;
}

export interface Source {
  url: string;
  value: string;
}
export interface MediaContent {
  url: string;
  width: string;
}

export interface MediaThumbnail {
  url: string;
  width: number;
  height: number;
}
export interface Category {
  term: string;
  label: string;
}
