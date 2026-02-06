import { Author, Link } from "../interface.ts";
import Item from "../item.ts";

export interface BlueskyFeedItem {
  post: {
    uri: string;
    cid: string;
    author: {
      did: string;
      handle: string;
      displayName?: string;
      avatar?: string;
    };
    record: {
      text: string;
      createdAt: string;
      embed?: {
        $type: string;
        external?: {
          uri: string;
          title: string;
          description: string;
          thumb?: {
            $type: string;
            ref: { $link: string };
            mimeType: string;
            size: number;
          };
        };
      };
    };
    embed?: {
      $type: string;
      external?: {
        uri: string;
        title: string;
        description: string;
        thumb?: string;
      };
    };
    likeCount?: number;
    replyCount?: number;
    repostCount?: number;
    indexedAt: string;
  };
}

export default class blueskylink extends Item<BlueskyFeedItem> {
  getId(): string {
    const uri = this.originalItem.post.uri;
    // uri format: at://did:plc:xxx/app.bsky.feed.post/rkey
    const parts = uri.split("/");
    return parts[parts.length - 1];
  }

  getOriginalPublishedDate(): Date {
    return new Date(this.originalItem.post.record.createdAt);
  }

  isValid(): boolean {
    const embed = this.originalItem.post.embed;
    if (!embed || embed.$type !== "app.bsky.embed.external#view") {
      return false;
    }
    if (!embed.external?.uri) {
      return false;
    }
    // Exclude self-links to bsky.app
    try {
      const hostname = new URL(embed.external.uri).hostname;
      if (hostname === "bsky.app" || hostname.endsWith(".bsky.app")) {
        return false;
      }
    } catch {
      return false;
    }
    return true;
  }

  getUrl(): string {
    const embed = this.originalItem.post.embed;
    if (embed?.external?.uri) {
      return embed.external.uri;
    }
    return this.getExternalUrl() || "";
  }

  getTitle(): string | null | undefined {
    const embed = this.originalItem.post.embed;
    if (embed?.external?.title) {
      return embed.external.title;
    }
    return null;
  }

  getImage(): string | null | undefined {
    const embed = this.originalItem.post.embed;
    if (embed?.external?.thumb) {
      return embed.external.thumb;
    }
    return null;
  }

  getScore(): number {
    return this.originalItem.post.likeCount || 0;
  }

  getNumComments(): number {
    return this.originalItem.post.replyCount || 0;
  }

  getExternalUrl(): string | undefined {
    const post = this.originalItem.post;
    const handle = post.author.handle;
    const rkey = this.getId();
    return `https://bsky.app/profile/${handle}/post/${rkey}`;
  }

  getAuthors(): Author[] {
    const author = this.originalItem.post.author;
    return [
      {
        name: author.displayName || author.handle,
        url: `https://bsky.app/profile/${author.handle}`,
        avatar: author.avatar,
      },
    ];
  }

  getTags(): string[] {
    return this.getAuthors().map((author) => author.name);
  }

  getLinks(): Link[] {
    const externalUrl = this.getExternalUrl();
    if (externalUrl) {
      return [
        {
          name: "Bluesky",
          url: externalUrl,
        },
      ];
    }
    return [];
  }
}
