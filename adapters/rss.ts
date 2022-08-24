import { Author } from "../interface.ts";
import Item from "../item.ts";
const prefixies = ["Show HN: ", "Ask HN: ", "Tell HN: ", "Poll: "];
export default class rss extends Item<RSSItem> {
  getOriginalPublishedDate(): Date {
    return new Date(this.originalItem.published as string);
  }
  getId(): string {
    return this.originalItem.id as string;
  }
  getTitle(): string {
    const title = this.originalItem.title.value as string;
    for (const prefix of prefixies) {
      if (title.startsWith(prefix)) {
        return title.slice(prefix.length);
      }
    }
    return title;
  }
  getTitlePrefix(): string {
    return "";
  }

  getUrl(): string {
    return this.originalItem.links[0].href;
  }

  getAuthors(): Author[] {
    return [];
  }

  getTags(): string[] {
    // check if specific tags are present in the item
    // like Show HN, Ask HN, etc.
    const tags: string[] = [];

    return tags;
  }
}
export interface RSSItem {
  source: Source;
  id: string;
  title: Description;
  description: Description;
  published: string;
  publishedRaw: string;
  updated: string;
  updatedRaw: string;
  links: Link2[];
  _id?: string;
  _url?: string;
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
