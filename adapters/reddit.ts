import { Author, Link, Video, VideoSource } from "../interface.ts";
import Item from "../item.ts";
import { contentType } from "../deps.ts";
const prefixies: string[] = [];
export default class reddit extends Item<RedditItem> {
  getOriginalPublishedDate(): Date {
    return new Date(this.originalItem.data.created * 1000);
  }
  getId(): string {
    return this.originalItem.data.id as string;
  }
  getTitle(): string {
    const title = this.originalItem.data.title as string;
    for (const prefix of prefixies) {
      if (title.startsWith(prefix)) {
        return title.slice(prefix.length);
      }
    }
    return title;
  }
  getTitlePrefix(): string {
    const title = this.originalItem.data.title as string;
    for (const prefix of prefixies) {
      if (title.startsWith(prefix)) {
        return prefix;
      }
    }
    return "";
  }
  getImage(): string | null | undefined {
    const node = this.originalItem.data;
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
  getVideo(): Video | undefined {
    const node = this.originalItem.data;
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
    return this.originalItem.data.url as string || this.getExternalUrl();
  }
  getSubreddit(): string {
    return this.originalItem.data.subreddit as string;
  }
  getSensitive(): boolean {
    return this.originalItem.data.over_18 || false;
  }
  getExternalUrl(): string {
    return `https://old.reddit.com${this.originalItem.data.permalink}`;
  }
  getAuthors(): Author[] {
    return [{
      name: this.originalItem.data.author as string,
      url: `https://old.reddit.com/user/${this.originalItem.data.author}`,
    }];
  }
  getPoints(): number {
    return this.originalItem.data.score as number;
  }
  getCommentCount(): number {
    return this.originalItem.data.num_comments as number;
  }
  getLinks(): Link[] {
    if (this.getPoints() > 0) {
      return [
        {
          url: this.getExternalUrl(),
          name: `&uarr;${this.getPoints()} votes`,
        },
      ];
    } else {
      return [
        {
          url: this.getExternalUrl(),
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
  kind: string;
  data: Data;
}

export interface Data {
  media: Media;
  approved_at_utc: null;
  subreddit: string;
  selftext: string;
  author_fullname: string;
  saved: boolean;
  mod_reason_title: null;
  gilded: number;
  clicked: boolean;
  title: string;
  link_flair_richtext: any[];
  subreddit_name_prefixed: string;
  hidden: boolean;
  pwls: number;
  link_flair_css_class: null;
  downs: number;
  thumbnail_height: number;
  top_awarded_type: string;
  hide_score: boolean;
  name: string;
  quarantine: boolean;
  link_flair_text_color: string;
  upvote_ratio: number;
  author_flair_background_color: null;
  subreddit_type: string;
  ups: number;
  total_awards_received: number;
  thumbnail_width: number;
  author_flair_template_id: null;
  is_original_content: boolean;
  user_reports: any[];
  secure_media: null;
  is_reddit_media_domain: boolean;
  is_meta: boolean;
  category: null;
  link_flair_text: null;
  can_mod_post: boolean;
  score: number;
  approved_by: null;
  is_created_from_ads_ui: boolean;
  author_premium: boolean;
  thumbnail: string;
  edited: boolean;
  author_flair_css_class: null;
  author_flair_richtext: any[];
  gildings: Gildings;
  post_hint: string;
  content_categories: null;
  is_self: boolean;
  mod_note: null;
  created: number;
  link_flair_type: string;
  wls: number;
  removed_by_category: null;
  banned_by: null;
  author_flair_type: string;
  domain: string;
  allow_live_comments: boolean;
  selftext_html: null;
  likes: null;
  suggested_sort: null;
  banned_at_utc: null;
  url_overridden_by_dest: string;
  view_count: null;
  archived: boolean;
  no_follow: boolean;
  is_crosspostable: boolean;
  pinned: boolean;
  over_18: boolean;
  preview: Preview;
  all_awardings: AllAwarding[];
  awarders: any[];
  media_only: boolean;
  can_gild: boolean;
  spoiler: boolean;
  locked: boolean;
  author_flair_text: null;
  treatment_tags: any[];
  visited: boolean;
  removed_by: null;
  num_reports: null;
  distinguished: null;
  subreddit_id: string;
  author_is_blocked: boolean;
  mod_reason_by: null;
  removal_reason: null;
  link_flair_background_color: string;
  id: string;
  is_robot_indexable: boolean;
  report_reasons: null;
  author: string;
  discussion_type: null;
  num_comments: number;
  send_replies: boolean;
  whitelist_status: string;
  contest_mode: boolean;
  mod_reports: any[];
  author_patreon_flair: boolean;
  author_flair_text_color: null;
  permalink: string;
  parent_whitelist_status: string;
  stickied: boolean;
  url: string;
  subreddit_subscribers: number;
  created_utc: number;
  num_crossposts: number;
  is_video: boolean;
}

export interface AllAwarding {
  giver_coin_reward: null;
  subreddit_id: null;
  is_new: boolean;
  days_of_drip_extension: number | null;
  coin_price: number;
  id: string;
  penny_donate: null;
  award_sub_type: AwardSubType;
  coin_reward: number;
  icon_url: string;
  days_of_premium: number | null;
  tiers_by_required_awardings: null;
  resized_icons: ResizedIcon[];
  icon_width: number;
  static_icon_width: number;
  start_date: null;
  is_enabled: boolean;
  awardings_required_to_grant_benefits: null;
  description: string;
  end_date: null;
  sticky_duration_seconds: null;
  subreddit_coin_reward: number;
  count: number;
  static_icon_height: number;
  name: string;
  resized_static_icons: ResizedIcon[];
  icon_format: null | string;
  icon_height: number;
  penny_price: number | null;
  award_type: AwardType;
  static_icon_url: string;
}

export enum AwardSubType {
  Appreciation = "APPRECIATION",
  Global = "GLOBAL",
  Premium = "PREMIUM",
}

export enum AwardType {
  Global = "global",
}

export interface ResizedIcon {
  url: string;
  width: number;
  height: number;
}

export interface Gildings {
  gid_1: number;
  gid_2: number;
  gid_3: number;
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
  source: ResizedIcon;
  resolutions: ResizedIcon[];
  variants: Variants;
  id: string;
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
export interface Variants {
  gif: GIF;
  mp4: GIF;
}

export interface GIF {
  source: Source;
  resolutions: Source[];
}

export interface Source {
  url: string;
  width: number;
  height: number;
}
