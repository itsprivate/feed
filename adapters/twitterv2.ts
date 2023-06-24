import { Author, Video } from "../interface.ts";
import Item from "../item.ts";
import { request, tryToRemoveUnnecessaryParams } from "../util.ts";
import log from "../log.ts";
import {
  Media,
  TweetURL,
  TwitterV2Item,
  User,
} from "../sources/fetch-twitter.ts";
export default class twitter extends Item<TwitterV2Item> {
  constructor(item: TwitterV2Item) {
    const tweetType = twitter.getTweetType(item);
    if (tweetType === "replied_to") {
      throw new Error("Quoted tweets are not supported");
    }
    let tweet = item;
    if (tweetType === "retweeted" && item.referenced_tweets) {
      // @ts-ignore: Unreachable code error
      const newTweet = item.includes.tweets.find(
        (tweet) => tweet.id === item.referenced_tweets![0].id
      );
      const tweetClone = {
        ...newTweet,
        includes: {
          ...item.includes,
        },
      };
      tweet = tweetClone as TwitterV2Item;
    }
    super(tweet);
  }
  static getTweetType(originalItem: TwitterV2Item): string {
    // console.log("originalItem", originalItem);
    if (
      originalItem.referenced_tweets &&
      originalItem.referenced_tweets.length > 0
    ) {
      return originalItem.referenced_tweets[0].type;
    } else {
      return "tweet";
    }
  }
  getOriginalPublishedDate(): Date {
    return new Date(this.originalItem.created_at);
  }
  getId(): string {
    return this.originalItem.id as string;
  }
  isValid(): boolean {
    const title = this.getFallbackTitle();
    if (!title) {
      // there is no title, so it is not valid
      return false;
    }
    return true;
  }

  getFallbackTitle(): string {
    const tweet = this.originalItem;
    let title = this.originalItem.text as string;

    // and replace the real links
    if (tweet && tweet.entities) {
      if (tweet.entities.urls && tweet.entities.urls.length > 0) {
        // not for latest url
        for (let i = 0; i < tweet.entities.urls.length; i++) {
          const urlEntity = tweet.entities.urls[i];
          // replace other url with empty
          title = title.replace(urlEntity.url, "");
        }
      }
    }

    return title;
  }

  getScore(): number {
    return this.originalItem.public_metrics.like_count;
  }

  getNumComments(): number {
    return this.originalItem.public_metrics.retweet_count;
  }
  isNeedToGetRedirectedUrl(): boolean {
    const url = this.getUrl();

    const urlObj = new URL(url);

    const hostname = urlObj.hostname;

    if (
      hostname === "nyti.ms" ||
      hostname === "econ.st" ||
      hostname === "on.wsj.com" ||
      hostname === "bit.ly" ||
      hostname === "on.ft"
    ) {
      // v2 do not need fetch redirect url
      return false;
    } else {
      return false;
    }
  }
  getLastUrlEntity(): TweetURL | undefined {
    const tweet = this.originalItem;
    if (
      tweet.entities &&
      tweet.entities.urls &&
      tweet.entities.urls.length > 0
    ) {
      for (let i = tweet.entities.urls.length - 1; i >= 0; i--) {
        const urlEntity = tweet.entities.urls[i];
        if (urlEntity.unwound_url && urlEntity.title && !urlEntity.media_key) {
          return urlEntity;
        }
      }
    }
  }
  getTitle(): string | null | undefined {
    const url = this.getUrl();
    const urlObj = new URL(url);
    const hostname = urlObj.hostname;

    const originalItem = this.originalItem;
    const urlEntity = this.getLastUrlEntity();
    if (urlEntity) {
      if (urlEntity.status === 200 && urlEntity.title) {
        return urlEntity.title;
      }
    } else {
      return null;
    }
    return null;
  }
  getTweetAuthor(): User {
    const author_id = this.originalItem.author_id;
    const includes = this.originalItem.includes;
    if (includes && includes.users) {
      const user = includes.users.find((user) => user.id === author_id);
      if (user) {
        return user;
      }
    }
    throw new Error("Cannot find author");
  }
  getUrl(): string {
    const urlEntity = this.getLastUrlEntity();
    let finalUrl = "";
    if (urlEntity && urlEntity.unwound_url) {
      finalUrl = urlEntity.unwound_url;
    } else if (urlEntity && urlEntity.expanded_url) {
      finalUrl = urlEntity.expanded_url;
    } else {
      const author = this.getTweetAuthor();

      finalUrl = `https://twitter.com/${author.username}/status/${this.originalItem.id}`;
    }
    finalUrl = tryToRemoveUnnecessaryParams(finalUrl);

    return finalUrl;
  }
  getExternalUrl(): string | undefined {
    const author = this.getTweetAuthor();

    const twitterUrl = `https://twitter.com/${author.username}/status/${this.originalItem.id}`;
    if (twitterUrl === this.getUrl()) {
      return;
    } else {
      return twitterUrl;
    }
  }
  getAuthors(): Author[] {
    const author = this.getTweetAuthor();
    return [
      {
        name: author.name,
        url: `https://twitter.com/${author.username}`,
        avatar: author.profile_image_url.replace(`_normal.`, `.`),
      },
    ];
  }

  getTags(): string[] {
    return this.getAuthors().map((author) => author.name);
  }
  getTweetFirstMedia(): Media | undefined {
    const mediaKeys = this.originalItem.attachments?.media_keys;
    if (mediaKeys && mediaKeys.length > 0) {
      const includes = this.originalItem.includes;
      if (includes && includes.media) {
        const media = includes.media.find(
          (media) => media.media_key === mediaKeys[0]
        );
        if (media) {
          return media;
        }
      }
    }
  }
  getImage(): string | null | undefined {
    const urlEntity = this.getLastUrlEntity();
    if (urlEntity && urlEntity.images) {
      const images = urlEntity.images;
      if (images.length > 0) {
        return images[0].url;
      }
    }

    const media = this.getTweetFirstMedia();
    if (media && media.type === "photo") {
      return media.url;
    } else {
      return null;
    }
  }
  getSensitive(): boolean {
    return this.originalItem.possibly_sensitive || false;
  }
  getVideo(): Video | undefined {
    let poster = "";
    const media = this.getTweetFirstMedia();
    if (media && media.type === "video") {
      if (
        media.variants &&
        media.variants.length > 0 &&
        media.preview_image_url
      ) {
        if (media.preview_image_url) {
          poster = media.preview_image_url;
        }
        const highestBitrate = media.variants.reduce((prev, current) => {
          let currentBitrate = current.bit_rate || 0;
          if (current.content_type !== "video/mp4") {
            currentBitrate = 0;
          }
          return (prev.bit_rate || 0) > currentBitrate ? prev : current;
        }, media.variants[0]);
        return {
          sources: [
            {
              url: highestBitrate.url,
              type: highestBitrate.content_type,
            },
          ],
          poster,
          width: media.width,
          height: media.height,
        };
        // get large size
      }
    }
  }
}
