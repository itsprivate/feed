import { Author, Embed } from "../interface.ts";
import Item from "../item.ts";
import log from "../log.ts";
export default class ph extends Item<PHItem> {
  getOriginalPublishedDate(): Date {
    return new Date(this.originalItem.node.createdAt);
  }
  getId(): string {
    return this.originalItem.node.slug as string;
  }
  getTitle(): string {
    return this.originalItem.node.tagline;
  }
  getTitlePrefix(): string {
    return `${this.originalItem.node.name} - `;
  }

  getScore(): number {
    return this.originalItem.node.votesCount;
  }

  getNumComments(): number {
    return this.originalItem.node.commentsCount;
  }
  isNeedToGetRedirectedUrl() {
    return false;
  }

  getUrl(): string {
    // check entities for urls
    return this.originalItem.node.website || this.originalItem.node.url;
  }
  getExternalUrl(): string | undefined {
    const url = this.originalItem.node.url;
    const urlObj = new URL(url);
    // remove all params
    urlObj.search = ``;
    return urlObj.href;
  }
  getAuthors(): Author[] {
    const node = this.originalItem.node;
    const author = node.user.name;
    const authorUrl = node.user.url;
    if (author && authorUrl) {
      return [
        {
          name: author,
          url: authorUrl,
        },
      ];
    }
    return [];
  }

  getTags(): string[] {
    const node = this.originalItem.node;
    const tags: string[] = [];
    if (node.topics && node.topics.edges && node.topics.edges.length > 0) {
      node.topics.edges.forEach((edge) => {
        tags.push(edge.node.name);
      });
    }
    return tags;
  }
  getImage(): string | null {
    const node = this.originalItem.node;
    let url = "";
    if (node.media && node.media.length > 0) {
      // Check if first media is an unsupported video (has videoUrl but not YouTube)
      const firstMedia = node.media[0];
      if (firstMedia.type === `video` && firstMedia.videoUrl && firstMedia.url) {
        const videoUrl = firstMedia.videoUrl;
        try {
          const urlObj = new URL(videoUrl);
          const isYouTube = urlObj.hostname === `www.youtube.com` ||
            urlObj.hostname === `youtu.be` ||
            urlObj.hostname === `youtube.com`;

          // If not YouTube (e.g., Loom), use the preview image/gif as fallback
          if (!isYouTube) {
            log.debug(`Using preview image for unsupported video: ${videoUrl}`);
            return firstMedia.url;
          }
        } catch (e) {
          // If URL parsing fails, use the preview image as fallback
          return firstMedia.url;
        }
      }

      // Otherwise, find the first image type media
      const imageItem = node.media.find(
        (item) => item.type === `image` && item.url,
      );

      if (imageItem) {
        url = imageItem.url;
      }
    }
    if (url) {
      return url;
    } else {
      return null;
    }
  }
  getSensitive(): boolean {
    return false;
  }
  getEmbed(): Embed | undefined {
    const node = this.originalItem.node;
    let url = "";
    if (node.media && node.media.length > 0) {
      if (node.media[0].type === `video` && node.media[0].videoUrl) {
        url = node.media[0].videoUrl;
        const urlObj = new URL(url);
        if (
          urlObj.hostname === `www.youtube.com` ||
          urlObj.hostname === `youtu.be` ||
          urlObj.hostname === `youtube.com`
        ) {
          // transform url to https://www.youtube.com/watch?v=nQCMDPWON5A&t=43s
          if (urlObj.hostname === `youtu.be`) {
            urlObj.hostname = `www.youtube.com`;
            urlObj.pathname = `/watch`;
            const urlPattern = new URLPattern({
              pathname: "/:id",
            });
            const urlMatch = urlPattern.exec(url);
            if (urlMatch) {
              urlObj.searchParams.set(
                `v`,
                urlMatch.pathname.groups.id as string,
              );
            } else {
              log.warn(`Cannot parse youtube url: ${url} - skipping embed`);
              return undefined;
            }
          } else {
            // test is embed url
            const urlPattern = new URLPattern({
              pathname: "/embed/:id",
            });
            const result = urlPattern.exec(url);
            if (result) {
              urlObj.searchParams.set(`v`, result.pathname.groups.id as string);
              urlObj.pathname = `/watch`;
            }
            if (urlObj.hostname === "youtube.com") {
              urlObj.hostname = "www.youtube.com";
            }
          }
          const embed: Embed = {
            provider: `youtube`,
            type: "video",
            url: urlObj.href,
          };
          return embed;
        } else {
          log.warn(
            `Unknown video provider: ${url} for ${this.getExternalUrl()} - skipping embed`,
          );
          return undefined;
        }
      }
      // https://img.youtube.com/vi/nQCMDPWON5A/hqdefault.jpg
      // youtube preview img
    }
    return undefined;
  }
}

export interface PHItem {
  node: PHNodeItem;
}
export interface PHNodeItem {
  id: string;
  commentsCount: number;
  createdAt: string;
  description: string;
  featuredAt: string;
  media: Media[];
  name: string;
  productLinks: ProductLink[];
  user: User;
  reviewsCount: number;
  reviewsRating: number;
  slug: string;
  tagline: string;
  url: string;
  votesCount: number;
  website: string;
  topics: Topics;
}

export interface Media {
  type: string;
  url: string;
  videoUrl: null | string;
}

export interface ProductLink {
  type: string;
  url: string;
}

export interface Topics {
  edges: Edge[];
}

export interface Edge {
  node: Node;
}

export interface Node {
  name: string;
}

export interface User {
  name: string;
  url: string;
}
