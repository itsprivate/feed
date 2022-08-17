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
  getTags(): string[] {
    // check if specific tags are present in the item
    // like Show HN, Ask HN, etc.
    const tags: string[] = [];
    const originalItem = this.originalItem as Record<string, unknown>;
    if (originalItem._tags && Array.isArray(originalItem._tags)) {
      if (originalItem._tags.includes("show_hn")) {
        tags.push("Show HN");
      } else if (originalItem._tags.includes("ask_hn")) {
        tags.push("Ask HN");
      } else if (originalItem._tags.includes("job")) {
        tags.push("Job");
      } else if (originalItem._tags.includes("poll")) {
        tags.push("Poll");
      }
    }

    return tags;
  }
}
