import { Author, Link, Video, VideoSource } from "../interface.ts";
import Item from "../item.ts";
import { contentType } from "../deps.ts";
const prefixies: string[] = [];
export default class reddit extends Item<RedditItem> {
  getOriginalPublishedDate(): Date {
    return new Date(this.originalItem.original_created_utc * 1000);
  }
  getId(): string {
    const id = this.originalItem.permalink;
    // replace / to -- to avoid conflict with path
    return id.slice(1, -1).replace(/\//g, "--");
  }
  getTitle(): string {
    const title = this.originalItem.title as string;
    for (const prefix of prefixies) {
      if (title.startsWith(prefix)) {
        return title.slice(prefix.length);
      }
    }
    return title;
  }
  getTitlePrefix(): string {
    const title = this.originalItem.title as string;
    for (const prefix of prefixies) {
      if (title.startsWith(prefix)) {
        return prefix;
      }
    }
    return "";
  }
  getImage(): string | null | undefined {
    const node = this.originalItem;
    let image = null;
    if (
      node.preview &&
      node.preview.images &&
      node.preview.images[0] &&
      node.preview.images[0].source &&
      node.preview.images[0].source.url
    ) {
      if (
        node.preview.images[0].resolutions &&
        node.preview.images[0].resolutions.length > 0
      ) {
        image = node.preview.images[0].resolutions[
          node.preview.images[0].resolutions.length - 1
        ].url;
      } else {
        image = node.preview.images[0].source.url;
      }
      if (image.startsWith(`https://preview.`)) {
        // image = image.replace(
        //   `https://preview.`,
        //   `https://i.`,
        // );
      }
    }
    return image;
  }
  getFullTranslations(): Record<string, Record<string, string>> {
    const translations: Record<string, Record<string, string>> = {
      "en": {
        title: this.getTitle(),
      },
    };
    if (this.originalItem.localize) {
      for (const locale of this.originalItem.localize) {
        let languageCode = locale.locale;
        if (languageCode === "zh") {
          languageCode = "zh-Hans";
        }
        if (!locale.title) {
          throw new Error("no title " + this.getId());
        }
        translations[languageCode] = {
          "title": locale.title,
        };
      }
    } else {
      console.log("no locale", this.getId());
    }

    return translations;
  }
  getVideo(): Video | undefined {
    const node = this.originalItem;
    let video: Video | undefined;
    if (
      node.media &&
      node.media.reddit_video &&
      node.media.reddit_video.fallback_url
    ) {
      const videoUrl = node.media.reddit_video.fallback_url;
      const videoType = contentType(videoUrl);
      const videoSource: VideoSource = { url: videoUrl };
      if (videoType) {
        videoSource.type = videoType;
      }
      video = {
        sources: [
          videoSource,
        ],
        width: node.media.reddit_video.width,
        height: node.media.reddit_video.height,
      };
    } else if (
      node.preview &&
      node.preview.images &&
      node.preview.images[0] &&
      node.preview.images[0].variants &&
      node.preview.images[0].variants.mp4 &&
      node.preview.images[0].variants.mp4.source &&
      node.preview.images[0].variants.mp4.source.url
    ) {
      // gif
      const videoUrl = node.preview.images[0].variants.mp4.source.url;
      const videoType = contentType(videoUrl);
      const videoSource: VideoSource = { url: videoUrl };
      if (videoType) {
        videoSource.type = videoType;
      }
      video = {
        sources: [
          videoSource,
        ],
        width: node.preview.images[0].variants.mp4.source.width,
        height: node.preview.images[0].variants.mp4.source.height,
      };
    } else if (
      node.preview &&
      node.preview.reddit_video_preview &&
      node.preview.reddit_video_preview.fallback_url
    ) {
      const videoUrl = node.preview.reddit_video_preview.fallback_url;
      const videoType = contentType(videoUrl);
      const videoSource: VideoSource = { url: videoUrl };
      if (videoType) {
        videoSource.type = videoType;
      }
      video = {
        sources: [
          videoSource,
        ],
        width: node.preview.reddit_video_preview.width,
        height: node.preview.reddit_video_preview.height,
      };
    }
    const poster = this.getImage();
    if (video && poster) {
      video.poster = poster;
    }
    return video;
  }
  getUrl(): string {
    return `https://old.reddit.com${this.originalItem.permalink}`;
  }
  getSubreddit(): string {
    return this.originalItem.subreddit as string;
  }
  getSensitive(): boolean {
    return this.originalItem.sensitive || false;
  }
  getAuthors(): Author[] {
    return [{
      name: this.originalItem.author as string,
      url: `https://old.reddit.com/user/${this.originalItem.author}`,
    }];
  }
  getPoints(): number {
    return this.originalItem.score as number;
  }
  getCommentCount(): number {
    return 0;
  }
  getPublishedDate(): Date {
    return new Date(this.originalItem.created_utc * 1000);
  }
  getModifiedDate(): Date {
    return new Date(this.originalItem.created_utc * 1000);
  }
  getLinks(): Link[] {
    if (this.getPoints() > 0) {
      return [
        {
          url: this.getUrl(),
          name: `&uarr;${this.getPoints()} votes`,
        },
      ];
    } else {
      return [
        {
          url: this.getUrl(),
          name: `&rarr; Reddit Link`,
        },
      ];
    }
  }
  getTags(): string[] {
    // check if specific tags are present in the item
    // like Show HN, Ask HN, etc.
    const tags: string[] = [
      this.getSubreddit(),
    ];
    return tags;
  }
}
export interface RedditItem {
  author: string;
  original_created_utc: number;
  title: string;
  created_utc: number;
  selftext_html: null;
  score: number;
  preview: Preview;
  permalink: string;
  subreddit: string;
  id: string;
  is_self: boolean;
  media: Media;
  is_video: boolean;
  the_new_excerpt: string;
  localize: Localize[];
  sensitive: boolean;
}

export interface Localize {
  locale: string;
  title: string;
}

export interface Media {
  reddit_video: RedditVideo;
}

export interface RedditVideo {
  bitrate_kbps: number;
  fallback_url: string;
  height: number;
  width: number;
  scrubber_media_url: string;
  dash_url: string;
  duration: number;
  hls_url: string;
  is_gif: boolean;
  transcoding_status: string;
}

export interface Preview {
  images: Image[];
  enabled: boolean;
  reddit_video_preview: RedditVideoPreview;
}
export interface RedditVideoPreview {
  fallback_url: string;
  height: number;
  width: number;
}
export interface Image {
  source: Source;
  resolutions: Source[];
  variants: Variants;
  id: string;
}

export interface Source {
  url: string;
  width: number;
  height: number;
}

export interface Variants {
  gif: GIF;
  mp4: GIF;
}

export interface GIF {
  source: Source;
  resolutions: Source[];
}
