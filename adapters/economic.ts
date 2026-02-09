import RSS from "./rss.ts";
import { sha1 } from "../util.ts";
import log from "../log.ts";
export default class economic extends RSS {
  getImage(): string | null | undefined {
    return undefined;
  }
  getTitlePrefix(): string {
    const url = this.getUrl();
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    // url pattern /the-world-this-week/2022/11/10/business
    const urlPattern = new URLPattern({
      pathname: "/the-world-this-week/:year/:month/:day/:tag",
    });
    const result = urlPattern.exec(url);
    if (result && result.pathname && result.pathname.groups) {
      const { year, month, day, tag } = result.pathname.groups;
      return `${year}-${month}-${day} The World this Week - `;
    } else {
      return "";
    }
  }
}
