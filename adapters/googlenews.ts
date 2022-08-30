import RSS from "./rss.ts";
import { request, sha1 } from "../util.ts";
import log from "../log.ts";
export default class googlenews extends RSS {
  private id: string = super.getId();
  private url: string = super.getUrl();
  getId(): string {
    if (this.originalItem._id) {
      return this.originalItem._id;
    }
    return this.id;
  }
  getUrl(): string {
    if (this.originalItem._url) {
      return this.originalItem._url;
    }
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
    const title = super.getTitle();
    const latestIndex = title.lastIndexOf(" - ");
    const titleLength = title.length;
    let source = "";
    if (latestIndex > 0 && latestIndex > titleLength - 30) {
      source = title.slice(latestIndex + 3);
    }
    if (source.length > 0) {
      return ` - ${source}`;
    } else {
      return "";
    }
  }
  getTitle(): string {
    const titleSuffix = this.getTitleSuffix();
    if (titleSuffix.length > 0) {
      return super.getTitle().slice(0, -titleSuffix.length);
    }
    return super.getTitle();
  }

  getRawItem() {
    const originItem = super.getRawItem();
    originItem._id = this.getId();
    originItem._url = this.getUrl();
    return originItem;
  }

  async init(): Promise<void> {
    await super.init();
    // check if already init

    if (this.originalItem._id && this.originalItem._url) {
      return;
    }

    let id = super.getId();
    const title = super.getTitle();
    if (id.length > 32) {
      id = await sha1(title);
      this.id = id;
    }
    const fetchResult = await request(super.getUrl(), {
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
}
