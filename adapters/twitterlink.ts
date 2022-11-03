import { Author, Video } from "../interface.ts";
import { request } from "../util.ts";
import log from "../log.ts";
import Twitter from "./twitter.ts";
export default class twitterlink extends Twitter {
  isValid(): boolean {
    const url = this.getUrl();
    return !url.startsWith("https://twitter.com/");
  }
  getCategory(): string {
    let category = "";
    let url = this.getUrl();
    const urlObj = new URL(url);
    if (urlObj.hostname === "www.nytimes.com") {
    }

    return category;
  }
}
