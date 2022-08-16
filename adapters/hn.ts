import { Author, Link } from "../interface.ts";
import Item from "../item.ts";
export default class hn extends Item {
  getPublishedDate(): Date {
    return new Date(this.originalItem.created_at as string);
  }
  getId(): string {
    return this.originalItem.objectID as string;
  }
  getTitle(): string {
    return this.originalItem.title as string;
  }
  getUrl(): string {
    return this.originalItem.url as string || this.getExternalUrl();
  }
  getExternalUrl(): string {
    return `https://news.ycombinator.com/item?id=${this.getId()}`;
  }
  getAuthors(): Author[] {
    return [{
      name: this.originalItem.author as string,
      url: `https://news.ycombinator.com/user?id=${this.originalItem.author}`,
    }];
  }
  getLinks(): Link[] {
    return [
      {
        url: this.getExternalUrl(),
        name: "HN Discussion",
      },
    ];
  }
}
