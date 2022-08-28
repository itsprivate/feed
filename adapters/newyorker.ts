import RSS from "./rss.ts";
import { sha1 } from "../util.ts";
import log from "../log.ts";
export default class newyorker extends RSS {
  getTags(): string[] {
    let tags: string[] = [];

    if (
      this.originalItem.categories &&
      Array.isArray(this.originalItem.categories)
    ) {
      this.originalItem.categories.forEach((item) => {
        if (item.label) {
          const splited = item.label.split("/");
          if (splited.length > 0) {
            splited.forEach((tag) => {
              if (tag) {
                tags.push(tag.trim());
              }
            });
          }
        }
      });
    }
    if (this.originalItem["media:keywords"]) {
      this.originalItem["media:keywords"].split(",").map((item) => {
        tags.push(item.trim());
      });
    }
    // unique
    tags = [...new Set(tags)];
    return tags;
  }
  getImage(): string | null | undefined {
    if (this.originalItem["media:thumbnail"]) {
      return this.originalItem["media:thumbnail"].url;
    } else {
      return null;
    }
  }
  getTitle(): string {
    const title = this.originalItem.title.value;
    const description = this.originalItem.description.value;

    return `${title} - ${description}`;
  }
}
