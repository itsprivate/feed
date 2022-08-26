import { Author, Embed } from "../interface.ts";
import Item from "../item.ts";
export default class devto extends Item<DevtoItem> {
  getOriginalPublishedDate(): Date {
    return new Date(this.originalItem.created_at);
  }
  getId(): string {
    return this.originalItem.id.toString();
  }
  getTitle(): string {
    return this.originalItem.title;
  }

  getScore(): number {
    return this.originalItem.positive_reactions_count;
  }

  getNumComments(): number {
    return this.originalItem.comments_count;
  }
  getUrl(): string {
    // check entities for urls
    return this.originalItem.url;
  }

  getAuthors(): Author[] {
    const node = this.originalItem;
    const author = node.user.name;
    const authorUrl = `https://dev.to/${node.user.username}`;
    if (author && authorUrl) {
      return [{
        name: author,
        url: authorUrl,
      }];
    }
    return [];
  }

  getTags(): string[] {
    return this.originalItem.tag_list || [];
  }
  getImage(): string | null {
    const item = this.originalItem;
    const image = item.cover_image || item.social_image;
    if (image) {
      return image;
    } else {
      return null;
    }
  }
  getSensitive(): boolean {
    return false;
  }
}

export interface DevtoItem {
  type_of: string;
  id: number;
  title: string;
  description: string;
  readable_publish_date: string;
  slug: string;
  path: string;
  url: string;
  comments_count: number;
  public_reactions_count: number;
  collection_id: null;
  published_timestamp: string;
  positive_reactions_count: number;
  cover_image: string;
  social_image: string;
  canonical_url: string;
  created_at: string;
  edited_at: null;
  crossposted_at: null;
  published_at: string;
  last_comment_at: string;
  reading_time_minutes: number;
  tag_list: string[];
  tags: string;
  user: User;
}

export interface User {
  name: string;
  username: string;
  twitter_username: string;
  github_username: string;
  user_id: number;
  website_url: string;
  profile_image: string;
  profile_image_90: string;
}
