import { Author, Video } from "../interface.ts";
import Item from "../item.ts";
export default class ph extends Item<PHItemNode> {
  constructor(item: PHItemNode) {
    // @ts-ignore: this is a valid item
    super(item.node);
  }
  getOriginalPublishedDate(): Date {
    return new Date(this.originalItem.createdAt);
  }
  getId(): string {
    return this.originalItem.id as string;
  }
  getTitle(): string {
    return this.originalItem.tagline;
  }

  getScore(): number {
    return this.originalItem.votesCount;
  }

  getNumComments(): number {
    return this.originalItem.commentsCount;
  }

  getUrl(): string {
    // check entities for urls
    return this.originalItem.website || this.originalItem.url;
  }
  getExternalUrl(): string | undefined {
    return this.originalItem.url;
  }
  getAuthors(): Author[] {
    // todo
    return [];
  }

  getTags(): string[] {
    return [];
  }
  getImage(): string | null {
    return null;
  }
  getSensitive(): boolean {
    return false;
  }
  getVideo(): Video | undefined {
    return undefined;
  }
}
export interface PHItem {
  node: PHItemNode;
}

export interface PHItemNode {
  id: string;
  commentsCount: number;
  createdAt: string;
  description: string;
  featuredAt: string;
  media: Thumbnail[];
  name: string;
  productLinks: ProductLink[];
  reviewsCount: number;
  reviewsRating: number;
  slug: string;
  tagline: string;
  url: string;
  thumbnail: Thumbnail;
  votesCount: number;
  website: string;
  topics: Topics;
}

export interface Thumbnail {
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
  node: EdgeNode;
}

export interface EdgeNode {
  name: string;
}
