import { Author, Video } from "../interface.ts";
import { request } from "../util.ts";
import log from "../log.ts";
import Twitter from "./twitter.ts";
export default class twitterlink extends Twitter {
  isValid(): boolean {
    const url = this.getUrl();
    return !url.startsWith("https://twitter.com/");
  }
  getCachedKeys(): string[] {
    return [
      `${this.getOriginalLanguage()}_${this.getType()}__${this.getId()}`,
      `${this.getUrl()}`,
      `${this.getTitle()}`,
    ];
  }
}
