import { Language } from "./interface.ts";
const isDev = () => {
  return Deno.env.get("DEV") === "1";
};
let handledItemsCount = 4;
if (Deno.env.get("FILES")) {
  handledItemsCount = Number(Deno.env.get("FILES"));
}
export const DEV_MODE_HANDLED_ITEMS = handledItemsCount;
export const TRANSLATED_ITEMS_PER_PAGE = isDev() ? 2 : 100;
export const MAX_ITEMS_PER_PAGE = 500;
export const TARGET_SITE_LANGUAEGS: Language[] = [{
  code: "zh-Hans",
  name: "简体中文",
  prefix: "",
}, {
  code: "zh-Hant",
  name: "繁体中文",
  prefix: "zh-Hant/",
}];

export const ROOT_DOMAIN = "buzzing.cc";
