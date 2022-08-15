import hn from "./hn.ts";
import Item from "../item.ts";
const adapters: Record<string, typeof Item> = {
  hn,
};
export default adapters;
