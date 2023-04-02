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
import twitterlink from "./twitterlink.ts";
import twittercbarraud from "./twittercbarraud.ts";
import spectator from "./spectator.ts";
import sitemap from "./sitemap.ts";
import economic from "./economic.ts";
import phys from "./phys.ts";
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
  // @ts-ignore: hard to type
  twitterlink,
  // @ts-ignore: hard to type
  twittercbarraud,
  // @ts-ignore: hard to type
  spectator,
  // @ts-ignore: hard to type
  sitemap,
  // @ts-ignore: hard to type
  economic,
  // @ts-ignore: hard to type
  phys,
};
export default adapters;
