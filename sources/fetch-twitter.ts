import { getTweets as getTweetsFn } from "https://deno.land/x/twitter_api_client@v0.3.1/api_v2/tweets/lookup.ts";
import { request } from "../util.ts";

export async function getTweets(ids: string[]): Promise<TwitterV2Item[]> {
  const bearerToken = Deno.env.get("TWITTER_BEARER_TOKEN");
  if (!bearerToken) {
    throw new Error("TWITTER_BEARER_TOKEN is not set");
  }

  const urlObj = new URL("https://api.twitter.com/2/tweets");
  urlObj.searchParams.set("ids", ids.join(","));
  urlObj.searchParams.set(
    "tweet.fields",
    "attachments,author_id,conversation_id,created_at,edit_controls,edit_history_tweet_ids,entities,geo,id,in_reply_to_user_id,lang,possibly_sensitive,public_metrics,referenced_tweets,reply_settings,source,text,withheld",
  );

  urlObj.searchParams.set(
    "media.fields",
    "alt_text,duration_ms,height,media_key,preview_image_url,public_metrics,type,url,variants,width",
  );
  urlObj.searchParams.set(
    "user.fields",
    "profile_image_url,username",
  );
  urlObj.searchParams.set(
    "expansions",
    "author_id,attachments.media_keys,referenced_tweets.id,referenced_tweets.id.author_id",
  );
  // console.log("urlObj.toString()", urlObj.toString());
  // return [];
  const res = await request(
    urlObj.toString(),
    {
      headers: {
        "Authorization": `Bearer ${bearerToken}`,
      },
    },
  );

  const json: Tweetv2 = await res.json();
  // write to temp.json
  // await Deno.writeTextFile("temp.json", JSON.stringify(json, null, 2));

  return json.data.map((tweet) => {
    const newTweet: TwitterV2Item = {
      ...tweet,
      includes: json.includes,
    };
    return newTweet;
  });
}
export interface Tweetv2 {
  data: Datum[];
  includes: Includes;
}

export interface Datum {
  text: string;
  entities?: DatumEntities;
  created_at: string;
  author_id: string;
  edit_history_tweet_ids: string[];
  conversation_id: string;
  id: string;
  source: string;
  edit_controls: EditControls;
  possibly_sensitive: boolean;
  attachments: Attachments;
  public_metrics: PublicMetrics;
  reply_settings: string;
  lang: string;
  referenced_tweets?: ReferencedTweet[];
  in_reply_to_user_id?: string;
}
export interface Attachments {
  media_keys: string[];
}

export interface TwitterV2Item extends Datum {
  includes: Includes;
}

export interface EditControls {
  edits_remaining: number;
  is_edit_eligible: boolean;
  editable_until: string;
}

export interface DatumEntities {
  hashtags?: Hashtag[];
  urls?: TweetURL[];
  annotations?: Annotation[];
  mentions?: Mention[];
}

export interface Annotation {
  start: number;
  end: number;
  probability: number;
  type: string;
  normalized_text: string;
}

export interface Hashtag {
  start: number;
  end: number;
  tag: string;
}

export interface Mention {
  start: number;
  end: number;
  username: string;
  id: string;
}

export interface TweetURL {
  start: number;
  end: number;
  url: string;
  expanded_url: string;
  display_url: string;
  status?: number;
  title?: string;
  description?: string;
  unwound_url?: string;
  media_key?: string;
  images?: Image[];
}

export interface Image {
  url: string;
  width: number;
  height: number;
}
export interface PublicMetrics {
  retweet_count: number;
  reply_count: number;
  like_count: number;
  quote_count: number;
}

export interface ReferencedTweet {
  type: string;
  id: string;
}

export interface Includes {
  users: User[];
  tweets: Tweet[];
  media: Media[];
}

export interface Media {
  height: number;
  media_key: string;
  type: string;
  width: number;
  url?: string;
  preview_image_url?: string;
  duration_ms?: number;
  variants?: Variant[];
  public_metrics?: MediaPublicMetrics;
}

export interface MediaPublicMetrics {
  view_count: number;
}

export interface Variant {
  bit_rate?: number;
  content_type: string;
  url: string;
}

export interface Tweet {
  text: string;
  created_at: string;
  author_id: string;
  edit_history_tweet_ids: string[];
  conversation_id: string;
  id: string;
  source: string;
  entities?: TweetEntities;
  edit_controls: EditControls;
  possibly_sensitive: boolean;
  public_metrics: PublicMetrics;
  reply_settings: string;
  lang: string;
  referenced_tweets?: ReferencedTweet[];
  in_reply_to_user_id?: string;
  attachments: Attachments;
}

export interface TweetEntities {
  urls?: TweetURL[];
  mentions?: Mention[];
}

export interface User {
  id: string;
  name: string;
  username: string;
  profile_image_url: string;
}
