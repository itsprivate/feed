import RSS from "./rss.ts";
import { getRedirectedUrlDirectly, request, sha1 } from "../util.ts";
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
  getImage() {
    return null;
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
    this.url = await getRedirectedUrlDirectly(super.getUrl());
    // this.url = await getGoogleNewsRedirectUrl(super.getUrl());
    this.id = await sha1(this.url);
  }
}

async function getGoogleNewsRedirectUrl(url: string): Promise<string> {
  // Opening <a href="
  const response = await request(url);
  const body = await response.text();
  // get text between Opening <a href=" and Closing "
  const realUrl = getGoogleNewsRedirectUrlByBody(body);
  if (realUrl) {
    return realUrl;
  } else {
    return url;
    // throw new Error("Can't get redirect url from google news");
  }
}

export function getGoogleNewsRedirectUrlByBody(body: string): string | null {
  // Opening <a href=""

  const regex = /Opening <a href="(.+?)"/;
  const match = regex.exec(body);
  if (match) {
    return match[1];
  } else {
    return null;
  }
}
