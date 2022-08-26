import { Author, Video } from "../interface.ts";
import Item from "../item.ts";
export default class ph extends Item<TwitterItem> {
  constructor(item: TwitterItem) {
    if (item.quoted_status) {
      throw new Error("Quoted tweets are not supported");
    }
    let tweet = item;
    if (item.retweeted_status) {
      // @ts-ignore: Unreachable code error
      tweet = item.retweeted_status;
    }
    super(tweet);
  }
  getOriginalPublishedDate(): Date {
    return new Date(this.originalItem.created_at);
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
  getVideo(): Video | undefined {
    const tweet = this.originalItem;
    let bitrate: number | undefined = 0;
    let hq_video_url = "";
    let content_type = "";
    let poster = "";
    let large: Large | undefined = undefined;
    if (tweet?.extended_entities?.media[0]?.video_info?.variants) {
      poster = tweet.extended_entities.media[0].media_url_https;
      const videoInfo = tweet?.extended_entities?.media[0]?.video_info;
      for (
        let j = 0;
        j < videoInfo.variants.length;
        j++
      ) {
        if (videoInfo.variants[j].bitrate) {
          if (
            tweet?.extended_entities?.media[0]?.video_info?.variants[j]
              .bitrate! >
              (bitrate as number)
          ) {
            bitrate = videoInfo.variants[j].bitrate;
            hq_video_url = videoInfo.variants[j].url;
            content_type = videoInfo.variants[j].content_type;
          }
        }
      }

      // get large size
      const sizes = tweet?.extended_entities?.media[0]?.sizes;
      large = sizes?.large;
      if (!large) {
        large = sizes?.medium;
      }
      if (!large) {
        large = sizes?.small;
      }
      if (!large) {
        large = sizes?.thumb;
      }
    }

    if (hq_video_url) {
      return {
        sources: [
          {
            url: hq_video_url,
            type: content_type,
          },
        ],
        poster,
        width: large?.w,
        height: large?.h,
      };
    }
  }
}

// function parseTweetFulltext(tweet: TwitterItem): {

// }
export interface TwitterItem {
  created_at: string;
  id: number;
  id_str: string;
  full_text: string;
  truncated: boolean;
  display_text_range: number[];
  entities: TwitterItemEntities;
  possibly_sensitive?: boolean;
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
  retweeted_status?: RetweetedStatus;
  is_quote_status: boolean;
  retweet_count: number;
  favorite_count: number;
  favorited: boolean;
  retweeted: boolean;
  lang: string;
  extended_entities: ExtendedEntities;
  quoted_status?: RetweetedStatus;
}

export interface TwitterItemEntities {
  hashtags: Hashtag[];
  symbols: any[];
  user_mentions: UserMention[];
  urls: any[];
  media?: Media[];
}

export interface Hashtag {
  text: string;
  indices: number[];
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
  video_info?: VideoInfo;
  additional_media_info?: AdditionalMediaInfo;
}

export interface AdditionalMediaInfo {
  title: string;
  description: string;
  embeddable: boolean;
  monetizable: boolean;
}

export interface Sizes {
  thumb: Large;
  small: Large;
  large: Large;
  medium: Large;
}

export interface Large {
  w: number;
  h: number;
  resize: string;
}

export interface VideoInfo {
  aspect_ratio: number[];
  duration_millis: number;
  variants: Variant[];
}

export interface Variant {
  bitrate?: number;
  content_type: string;
  url: string;
}

export interface UserMention {
  screen_name: string;
  name: string;
  id: number;
  id_str: string;
  indices: number[];
}

export interface RetweetedStatus {
  created_at: string;
  id: number;
  id_str: string;
  full_text: string;
  truncated: boolean;
  display_text_range: number[];
  entities: TwitterItemEntities;
  extended_entities: ExtendedEntities;
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

export interface ExtendedEntities {
  media: Media[];
}

export interface User {
  id: number;
  id_str: string;
  name: string;
  screen_name: string;
  location: string;
  description: string;
  url: string;
  entities: UserEntities;
  protected: boolean;
  followers_count: number;
  friends_count: number;
  listed_count: number;
  created_at: string;
  favourites_count: number;
  utc_offset: null;
  time_zone: null;
  geo_enabled: boolean;
  verified: boolean;
  statuses_count: number;
  lang: null;
  contributors_enabled: boolean;
  is_translator: boolean;
  is_translation_enabled: boolean;
  profile_background_color: string;
  profile_background_image_url: string;
  profile_background_image_url_https: string;
  profile_background_tile: boolean;
  profile_image_url: string;
  profile_image_url_https: string;
  profile_banner_url: string;
  profile_link_color: string;
  profile_sidebar_border_color: string;
  profile_sidebar_fill_color: string;
  profile_text_color: string;
  profile_use_background_image: boolean;
  has_extended_profile: boolean;
  default_profile: boolean;
  default_profile_image: boolean;
  following: null;
  follow_request_sent: null;
  notifications: null;
  translator_type: string;
  withheld_in_countries: any[];
}

export interface UserEntities {
  url: Description;
  description: Description;
}

export interface Description {
  urls: URL[];
}

export interface URL {
  url: string;
  expanded_url: string;
  display_url: string;
  indices: number[];
}

export interface ExtendedEntities {
  media: Media[];
}
