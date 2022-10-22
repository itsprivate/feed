import { Author, Video } from "../interface.ts";
import { request } from "../util.ts";
import log from "../log.ts";
import TwitterLink from "./twitterlink.ts";
export default class twittercbarraud extends TwitterLink {
  getFallbackTitle(): string {
    const fallbackTitle = super.getFallbackTitle();
    // get ther first line
    let firstLine = fallbackTitle;
    // empty emoji
    firstLine = firstLine
      .replace(
        /([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g,
        "",
      );

    // remove hash #
    firstLine = firstLine.replace(/#/g, "");
    // replace *Link:
    firstLine = firstLine.replace("*Link:", "");

    return firstLine.trim();
  }

  isValid(): boolean {
    const url = this.getUrl();
    return !url.startsWith("https://twitter.com/") &&
      !url.includes("www.christophe-barraud.com");
  }
}
