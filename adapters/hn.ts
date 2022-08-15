import { Link } from "../interface.ts";
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
    return this.originalItem.url as string;
  }
  getLinks(): Link[] {
    return [
      {
        url: `https://news.ycombinator.com/item?id=${this.getId()}`,
        name: "HN Discussion",
      },
    ];
  }
}
