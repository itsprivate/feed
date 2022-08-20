import hn, { HnItem } from "./hn.ts";
import Item from "../item.ts";
import reddit, { RedditItem } from "./reddit.ts";
import { Type } from "../interface.ts";
export type ItemType = Item<RedditItem | HnItem>;
const adapters: Record<string, Type<Item<RedditItem>>> = {
  // @ts-ignore: hard to type
  reddit,
  // @ts-ignore: hard to type
  hn,
};
export default adapters;
