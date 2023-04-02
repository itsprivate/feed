import RSS from "./rss.ts";
import { sha1 } from "../util.ts";
import log from "../log.ts";
export default class phys extends RSS {
  //模仿newYorker，categorie用/s分割，image只有缩略图
  getTags(): string[] {
    let tags: string[] = [];

    if (
      this.originalItem.categories &&
      Array.isArray(this.originalItem.categories)
    ) {
      this.originalItem.categories.forEach((item) => {
        if (item.label) {
          const splited = item.label.split(" ");
          if (splited.length > 0) {
            splited.forEach((tag) => {
              if (tag&&tag!==" ") {
                tags.push(tag.trim());
              }
            });
          }
        }
      });
    }
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
}
