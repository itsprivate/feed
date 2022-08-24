import hn, { HnItem } from "./hn.ts";
import Item from "../item.ts";
import reddit, { RedditItem } from "./reddit.ts";
import twitter from "./twitter.ts";

import rss from "./rss.ts";
import { Type } from "../interface.ts";
import googlenews from "./googlenews.ts";
export type ItemType = Item<RedditItem | HnItem>;
const adapters: Record<string, Type<Item<RedditItem>>> = {
  // @ts-ignore: hard to type
  reddit,
  // @ts-ignore: hard to type
  hn,
  // @ts-ignore: hard to type
  rss,
  // @ts-ignore: hard to type
  googlenews,
  // @ts-ignore: hard to type
  twitter,
};
export default adapters;
