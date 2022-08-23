import { Author, Link } from "../interface.ts";
import Item from "../item.ts";
const prefixies = ["Show HN: ", "Ask HN: ", "Tell HN: ", "Poll: "];
import { formatNumber } from "../util.ts";
export default class hn extends Item<HnItem> {
  getOriginalPublishedDate(): Date {
    return new Date(this.originalItem.created_at as string);
  }
  getId(): string {
    return this.originalItem.objectID as string;
  }
  getTitle(): string {
    const title = this.originalItem.title as string;
    for (const prefix of prefixies) {
      if (title.startsWith(prefix)) {
        return title.slice(prefix.length);
      }
    }
    return title;
  }
  getTitlePrefix(): string {
    const title = this.originalItem.title as string;
    for (const prefix of prefixies) {
      if (title.startsWith(prefix)) {
        return prefix;
      }
    }
    return "";
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
  getPoints(): number {
    return this.originalItem.points as number;
  }
  getCommentCount(): number {
    return this.originalItem.num_comments as number;
  }
  getLinks(): Link[] {
    if (this.getPoints() > 0) {
      return [
        {
          url: this.getExternalUrl(),
          name: `&uarr; ${formatNumber(this.getPoints())} HN Points`,
        },
      ];
    } else {
      return [
        {
          url: this.getExternalUrl(),
          name: `&rarr; HN Link`,
        },
      ];
    }
  }
  getTags(): string[] {
    // check if specific tags are present in the item
    // like Show HN, Ask HN, etc.
    const tags: string[] = [];
    const originalItem = this.originalItem;
    if (originalItem._tags && Array.isArray(originalItem._tags)) {
      if (originalItem._tags.includes("show_hn")) {
        tags.push("Show HN");
      } else if (originalItem._tags.includes("ask_hn")) {
        tags.push("Ask HN");
      } else if (originalItem._tags.includes("job")) {
        tags.push("Job");
      } else if (originalItem._tags.includes("poll")) {
        tags.push("Poll");
      } else if (this.getTitlePrefix() === "Tell HN: ") {
        tags.push("Tell HN");
      }
    }

    return tags;
  }
}
export interface HnItem {
  created_at: string;
  title: string;
  url: string;
  author: string;
  points: number;
  story_text: null;
  comment_text: null;
  num_comments: number;
  story_id: null;
  story_title: null;
  story_url: null;
  parent_id: null;
  created_at_i: number;
  _tags: string[];
  objectID: string;
  _highlightResult: HighlightResult;
}

export interface HighlightResult {
  title: HighlightResultItem;
  url: HighlightResultItem;
  author: HighlightResultItem;
}

export interface HighlightResultItem {
  value: string;
  matchLevel: string;
  matchedWords: any[];
}
