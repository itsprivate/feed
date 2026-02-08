import Item from "../item.ts";
import { sha1 } from "../util.ts";
import {
  GoogleNewsWebArticle,
} from "../sources/fetch-googlenews-web.ts";
export { type GoogleNewsWebArticle } from "../sources/fetch-googlenews-web.ts";

export default class googlenewsweb extends Item<GoogleNewsWebArticle> {
  private _id: string = "";

  override getId(): string {
    if (this.originalItem._id) {
      return this.originalItem._id;
    }
    return this._id;
  }

  override getUrl(): string {
    return this.originalItem.link;
  }

  override getTitle(): string {
    return this.originalItem.title;
  }

  override getTitleSuffix(): string {
    if (this.originalItem.source) {
      return ` - ${this.originalItem.source}`;
    }
    return "";
  }

  override getTags(): string[] {
    if (this.originalItem.source) {
      return [this.originalItem.source];
    }
    return [];
  }

  override getImage() {
    return null;
  }

  override getOriginalPublishedDate(): Date {
    if (this.originalItem.datetime) {
      const date = new Date(this.originalItem.datetime);
      if (!isNaN(date.getTime())) {
        return date;
      }
    }
    return new Date();
  }

  override getPublishedDate(): Date {
    // 使用原始发布时间作为 date_published，而不是抓取时间
    return this.getOriginalPublishedDate();
  }

  override getRawItem() {
    const item = { ...this.originalItem };
    item._id = this.getId();
    return item;
  }

  override async init(): Promise<void> {
    if (this.originalItem._id) {
      this._id = this.originalItem._id;
      return;
    }
    this._id = await sha1(this.originalItem.link);
  }
}
