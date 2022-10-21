import { Author, Video } from "../interface.ts";
import { request } from "../util.ts";
import log from "../log.ts";
import Twitter from "./twitter.ts";
export default class twitter_link extends Twitter {
  isValid(): boolean {
    const url = this.getUrl();
    return !url.startsWith("https://twitter.com/");
  }
  getCachedKey(): string {
    return `${this.getOriginalLanguage()}_${this.getType()}__${this.getUrl()}`;
  }
}
