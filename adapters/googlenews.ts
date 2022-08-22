import { Author, Link } from "../interface.ts";
import RSS from "./rss.ts";
import { sha1 } from "../util.ts";
export default class googlenews extends RSS {
  private id: string = super.getId();
  getId(): string {
    return this.id;
  }
  async init(): Promise<void> {
    await super.init();
    let id = super.getId();
    const title = super.getTitle();
    if (id.length > 32) {
      id = await sha1(title);
      this.id = id;
    }

    // get title unique

    // init to get the real url
    const fetchResult = await fetch(super.getUrl(), {
      redirect: "manual",
    });
    const text = await fetchResult.text();
    console.log("text", text);
    console.log("status", fetchResult.status);
    console.log("headers", fetchResult.headers);
  }
}
