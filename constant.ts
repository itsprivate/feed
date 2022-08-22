export { TARGET_SITE_LANGUAEGS } from "./common.js";
const isDev = () => {
  return Deno.env.get("DEV") === "1";
};
let handledItemsCount = 4;
if (Deno.env.get("FILES")) {
  handledItemsCount = Number(Deno.env.get("FILES"));
}
export const DEV_MODE_HANDLED_ITEMS = handledItemsCount;
export const TRANSLATED_ITEMS_PER_PAGE = isDev() ? 10 : 100;
export const MAX_ITEMS_PER_PAGE = 200;

export const ROOT_DOMAIN = "buzzing.cc";
