import { Author, Video, VideoSource } from "../interface.ts";
import Item from "../item.ts";
import { contentType } from "../deps.ts";
const prefixies: string[] = [];
import log from "../log.ts";
export default class twitter extends Item<TwitterItem> {
  private isRetweet = false;
  constructor(item: TwitterItem) {
    if (item.quoted_status) {
      throw new Error("Quoted tweets are not supported");
    }
    let tweet = item;
    if (item.retweeted_status) {
      // @ts-ignore: Unreachable code error
      tweet = item.retweeted_status;
      tweet.localize = item.localize;
      tweet.created_at = item.created_at;
      tweet.original_created_at = item.original_created_at;
    }
    super(tweet);
    if (item.retweeted_status) {
      this.isRetweet = true;
    }
  }
  getFullTranslations(): Record<string, Record<string, string>> {
    const translations: Record<string, Record<string, string>> = {
      "en": {
        title: this.getTitle(),
      },
    };
    const tweet = this.originalItem;
    if (this.originalItem.localize) {
      for (const locale of this.originalItem.localize) {
        let languageCode = locale.locale;
        if (languageCode === "zh") {
          languageCode = "zh-Hans";
        }
        let title = "";
        if (!this.isRetweet) {
          if (!locale.full_text) {
            throw new Error("no full_text " + this.getId());
          }
          title = locale.full_text;
        } else {
          if (!locale.retweeted_status_full_text) {
            throw new Error("no full_text " + this.getId());
          }
          title = locale.retweeted_status_full_text;
        }

        // handle url

        if (tweet.entities.media && Array.isArray(tweet.entities.media)) {
          for (let i = 0; i < tweet.entities.media.length; i++) {
            title = title.replace(tweet.entities.media[i].url, "");
          }
        }

        // and replace the real links
        if (tweet.entities.urls.length > 0) {
          // not for latest url
          for (let i = 0; i < tweet.entities.urls.length; i++) {
            const urlEntity = tweet.entities.urls[i];
            // replace other url with expanded url
            title = title.replace(urlEntity.url, urlEntity.expanded_url);
          }
        }
        translations[languageCode] = {
          "title": title,
        };
      }
    } else {
      log.info("no locale", this.getId());
    }

    return translations;
  }

  getPublishedDate(): Date {
    return new Date(this.originalItem.created_at);
  }
  getModifiedDate(): Date {
    return new Date(this.originalItem.created_at);
  }
  getOriginalPublishedDate(): Date {
    return new Date(this.originalItem.original_created_at);
  }
  getId(): string {
    return this.originalItem.id_str as string;
  }
  getTitle(): string {
    const tweet = this.originalItem;
    let title = this.originalItem.full_text as string;

    if (tweet.entities.media && Array.isArray(tweet.entities.media)) {
      for (let i = 0; i < tweet.entities.media.length; i++) {
        title = title.replace(tweet.entities.media[i].url, "");
      }
    }

    // and replace the real links
    if (tweet.entities.urls.length > 0) {
      // not for latest url
      for (let i = 0; i < tweet.entities.urls.length; i++) {
        const urlEntity = tweet.entities.urls[i];
        // replace other url with expanded url
        title = title.replace(urlEntity.url, urlEntity.expanded_url);
      }
    }

    return title;
  }

  getScore(): number {
    return this.originalItem.favorite_count;
  }

  getNumComments(): number {
    return this.originalItem.retweet_count;
  }

  getUrl(): string {
    // check entities for urls
    const tweet = this.originalItem;
    if (tweet.entities.urls.length > 0) {
      return tweet.entities.urls[tweet.entities.urls.length - 1].expanded_url;
    }
    return `https://twitter.com/${this.originalItem.user.screen_name}/status/${this.originalItem.id_str}`;
  }
  getExternalUrl(): string | undefined {
    const twitterUrl =
      `https://twitter.com/${this.originalItem.user.screen_name}/status/${this.originalItem.id_str}`;
    if (twitterUrl === this.getUrl()) {
      return;
    } else {
      return twitterUrl;
    }
  }
  getAuthors(): Author[] {
    return [
      {
        name: this.originalItem.user.name,
        url: `https://twitter.com/${this.originalItem.user.screen_name}`,
        avatar: this.originalItem.user.profile_image_url_https.replace(
          `_normal.`,
          `.`,
        ),
      },
    ];
  }

  getTags(): string[] {
    return this.getAuthors().map((author) => author.name);
  }
  getImage(): string | null {
    return this.originalItem.entities.media?.[0]?.media_url_https || null;
  }
  getSensitive(): boolean {
    return this.originalItem.possibly_sensitive || false;
  }
}
export interface TwitterItem {
  created_at: string;
  id_str: string;
  full_text: string;
  display_text_range: number[];
  entities: Entities;
  user: User;
  retweet_count: number;
  favorite_count: number;
  possibly_sensitive: boolean;
  original_created_at: string;
  localize: Localize[];
  source_updated_at: number;
  retweeted_status?: RetweetedStatus;
  quoted_status?: RetweetedStatus;
}
export interface RetweetedStatus {
  created_at: string;
  id: number;
  id_str: string;
  full_text: string;
  truncated: boolean;
  display_text_range: number[];
  entities: Entities;
  source: string;
  in_reply_to_status_id: null;
  in_reply_to_status_id_str: null;
  in_reply_to_user_id: null;
  in_reply_to_user_id_str: null;
  in_reply_to_screen_name: null;
  user: User;
  geo: null;
  coordinates: null;
  place: null;
  contributors: null;
  is_quote_status: boolean;
  retweet_count: number;
  favorite_count: number;
  favorited: boolean;
  retweeted: boolean;
  possibly_sensitive: boolean;
  lang: string;
}
export interface Entities {
  hashtags: any[];
  symbols: any[];
  user_mentions: any[];
  urls: any[];
  media: Media[];
}

export interface Media {
  id: number;
  id_str: string;
  indices: number[];
  media_url: string;
  media_url_https: string;
  url: string;
  display_url: string;
  expanded_url: string;
  type: string;
  sizes: Sizes;
}

export interface Sizes {
  small: Large;
  large: Large;
  thumb: Large;
  medium: Large;
}

export interface Large {
  w: number;
  h: number;
  resize: string;
}

export interface Localize {
  locale: string;
  full_text: string;
  retweeted_status_full_text?: string;
}

export interface User {
  name: string;
  screen_name: string;
  profile_image_url_https: string;
}
