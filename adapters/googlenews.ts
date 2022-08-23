import RSS from "./rss.ts";
import { sha1 } from "../util.ts";
import log from "../log.ts";
export default class googlenews extends RSS {
  private id: string = super.getId();
  private url: string = super.getUrl();
  getId(): string {
    return this.id;
  }
  getUrl(): string {
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

  async afterFetchInit(): Promise<void> {
    await super.afterFetchInit();
    let id = super.getId();
    const title = super.getTitle();
    if (id.length > 32) {
      id = await sha1(title);
      this.id = id;
    }
  }
  async beforeFormatInit(): Promise<void> {
    // get title unique
    await super.beforeFormatInit();
    // init to get the real url
    const fetchResult = await fetch(super.getUrl(), {
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
