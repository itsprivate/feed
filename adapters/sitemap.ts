import { Author } from "../interface.ts";
import Item from "../item.ts";
import { formatId } from "../util.ts";
export default class sitemap extends Item<Sitemap> {
  getOriginalPublishedDate(): Date {
    return new Date(
      this.originalItem["news:news"]["news:publication_date"] as string,
    );
  }
  getId(): string {
    // encode url id
    return formatId(this.getUrl());
  }
  getTitle(): string {
    const title = this.originalItem["news:news"]["news:title"] as string;

    return title;
  }

  getImage(): string | null | undefined {
    return this.originalItem["image:image"]
      ? (this.originalItem["image:image"]["image:loc"] || null)
      : null;
  }
  getUrl(): string {
    return this.originalItem["loc"];
  }
}
export interface Sitemap {
  loc: string;
  "news:news": NewsNews;
  "image:image": ImageImage;
}

export interface ImageImage {
  "image:loc": string;
  "image:license": string;
}

export interface NewsNews {
  "news:publication": NewsPublication;
  "news:publication_date": string;
  "news:title": string;
  "news:keywords": null;
  "news:stock_tickers": null;
}

export interface NewsPublication {
  "news:name": string;
  "news:language": string;
}
