import hn, { HnItem } from "./hn.ts";
import Item from "../item.ts";
import reddit, { RedditItem } from "./reddit.ts";
import twitter from "./twitter.ts";
import ph from "./ph.ts";
import rss from "./rss.ts";
import devto from "./devto.ts";
import { Type } from "../interface.ts";
import newyorker from "./newyorker.ts";
import googlenews from "./googlenews.ts";
import lobste from "./lobste.ts";
import thechinaproject from "./thechinaproject.ts";
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
  // @ts-ignore: hard to type
  ph,
  // @ts-ignore: hard to type
  devto,
  // @ts-ignore: hard to type
  newyorker,
  // @ts-ignore: hard to type
  lobste,
  // @ts-ignore: hard to type
  thechinaproject,
};
export default adapters;
