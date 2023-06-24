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
  getImageMetaUrl(): string | undefined {
    // check is bloomberg
    let url = this.getUrl();
    const urlObj = new URL(url);
    const authors = this.getAuthors();
    const author = authors[0];
    const authorUrl = author.url;
    const authorUrlObj = new URL(authorUrl);
    const screenName = authorUrlObj.pathname.split("/")[1];
    console.log("urlObj", urlObj);
    console.log("authorUrlObj", authorUrlObj);
    if (urlObj.hostname === "www.bloomberg.com") {
      const nitterUrl = `https://nitter.freedit.eu/${screenName}/status/${this.getId()}`;
      console.log("nitterUrl", nitterUrl);
      return nitterUrl;
    } else {
      return undefined;
    }
  }
}
