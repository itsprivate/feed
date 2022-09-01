import { Embed, FormatedItem, Link, LinkOptions, Video } from "../interface.ts";
import Item from "../item.ts";
import log from "../log.ts";
import { formatNumber, parseItemIdentifier } from "../util.ts";
export default class source extends Item<FormatedItem> {
  getSensitive(): boolean {
    return this.originalItem._sensitive || false;
  }
  getOriginalPublishedDate(): Date {
    return new Date(this.originalItem._original_published as string);
  }
  getItemIdentifier(): string {
    return this.originalItem.id as string;
  }
  getOriginalLanguage(): string {
    return this.originalItem._original_language || "en";
  }
  getPublishedDate(): Date {
    return new Date(this.originalItem.date_published);
  }
  getModifiedDate(): Date {
    return new Date(this.originalItem.date_modified);
  }
  getId(): string {
    const parsedId = parseItemIdentifier(this.originalItem.id);
    return parsedId.id;
  }
  getTitle(): string {
    const language = this.originalItem._original_language;
    if (this.originalItem._translations) {
      if (this.originalItem._translations[language]) {
        return this.originalItem._translations[language].title;
      }
    }
    return "";
  }
  getTitlePrefix(): string {
    return this.originalItem._title_prefix || "";
  }
  getTitleSuffix(): string {
    return this.originalItem._title_suffix || "";
  }

  getUrl(): string {
    return this.originalItem.url as string;
  }
  getExternalUrl() {
    return this.originalItem.external_url;
  }
  getAuthors() {
    return this.originalItem.authors || [];
  }
  getScore() {
    return this.originalItem._score || 0;
  }
  getNumComments() {
    return this.originalItem._num_comments || 0;
  }
  getImage(): string | null {
    return this.originalItem.image || null;
  }
  getVideo(): Video | undefined {
    return this.originalItem._video;
  }

  getEmbed(): Embed | undefined {
    if (this.originalItem._embed) {
      return this.originalItem._embed;
    }

    const url = this.getUrl();
    const urlObj = new URL(url);
    let isMatched = false;
    if (
      urlObj.hostname === `www.youtube.com` ||
      urlObj.hostname === `youtu.be` || urlObj.hostname === `youtube.com`
    ) {
      // https://img.youtube.com/vi/nQCMDPWON5A/hqdefault.jpg
      // youtube preview img
      // transform url to https://www.youtube.com/watch?v=nQCMDPWON5A&t=43s
      if (urlObj.hostname === `youtu.be`) {
        urlObj.hostname = `www.youtube.com`;
        urlObj.pathname = `/watch`;
        const urlPattern = new URLPattern({
          pathname: "/:id",
        });
        const urlMatch = urlPattern.exec(url);
        if (urlMatch) {
          urlObj.searchParams.set(`v`, urlMatch.pathname.groups.id);
          isMatched = true;
        } else {
          log.debug(`cannot parse youtube url: ${url}`);
        }
      } else {
        // test is embed url
        const urlPattern = new URLPattern({
          pathname: "/embed/:id",
        });
        const result = urlPattern.exec(url);
        if (result) {
          urlObj.searchParams.set(`v`, result.pathname.groups.id);
          urlObj.pathname = `/watch`;
          isMatched = true;
        }
        if (urlObj.hostname === "youtube.com") {
          urlObj.hostname = "www.youtube.com";
          // test is watch url
          const urlPattern = new URLPattern({
            pathname: "/watch",
            search: "?v=:id",
          });
          const result = urlPattern.exec(url);
          if (result) {
            isMatched = true;
          }
        }
      }
      if (isMatched) {
        const embed: Embed = {
          provider: `youtube`,
          type: "video",
          url: urlObj.href,
        };
        return embed;
      } else {
        return undefined;
      }
    }

    return undefined;
  }
  getTags() {
    return this.originalItem.tags || [];
  }
  getType(): string {
    const id = this.getItemIdentifier();
    const parsedId = parseItemIdentifier(id);
    return parsedId.type;
  }
  isText(): boolean {
    const type = this.getType();
    if (type === "twitter") {
      return true;
    }
    return false;
  }
  getFullTranslations(): Record<string, Record<string, string>> | undefined {
    if (this.originalItem._translations) {
      return this.originalItem._translations;
    } else {
      return undefined;
    }
  }
  getLinks(options?: LinkOptions): Link[] {
    const type = this.getType();
    const links: Link[] = [];
    const externalLink = this.getExternalUrl();
    let linkSymbol = "👉";
    if (options && options.isUseHTML) {
      linkSymbol = "&uarr;";
    }
    let externalLinkName = "";
    if (type === "hn") {
      if (this.getScore()) {
        externalLinkName = `${linkSymbol} ${
          formatNumber(this.getScore())
        } HN Points`;
      } else {
        externalLinkName = "HN Link";
      }
    } else if (type === "reddit") {
      if (this.getScore() && this.getExternalUrl()) {
        externalLinkName = `${linkSymbol} ${
          formatNumber(this.getScore())
        } Reddit Upvotes`;
      } else {
        externalLinkName = `Reddit Link`;
      }
    } else if (type === "twitter") {
      if (
        this.getScore() && this.getExternalUrl()
      ) {
        externalLinkName = `${linkSymbol} ${
          formatNumber(this.getScore())
        } Twitter Like`;
      } else {
        externalLinkName = `Twitter Link`;
      }
    } else if (type === "ph") {
      if (this.getScore() && this.getExternalUrl()) {
        externalLinkName = `${linkSymbol} ${
          formatNumber(this.getScore())
        } PH Upvotes`;
      } else {
        externalLinkName = `PH Link`;
      }
    }

    if (externalLink && externalLinkName) {
      links.push({
        url: externalLink,
        name: externalLinkName,
      });
    }
    return links;
  }
}
