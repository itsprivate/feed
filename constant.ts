const isDev = () => {
  return Deno.env.get("DEV") !== "0" && Deno.env.get("PROD") !== "1";
};
let handledItemsCount = 4;
if (Deno.env.get("FILES")) {
  handledItemsCount = Number(Deno.env.get("FILES"));
}
export const DEV_MODE_HANDLED_ITEMS = handledItemsCount;

let translatedItemsPerPage = isDev() ? 10 : 100;
if (Deno.env.get("TRANSLATED_ITEMS_PER_PAGE")) {
  translatedItemsPerPage = Number(Deno.env.get("TRANSLATED_ITEMS_PER_PAGE"));
}
export const TRANSLATED_ITEMS_PER_PAGE = translatedItemsPerPage;
export const MAX_ITEMS_PER_PAGE = 200;

export const ROOT_DOMAIN = "buzzing.cc";
export const TARGET_SITE_LANGUAEGS = [
  {
    code: "zh-Hans",
    name: "简体中文",
    prefix: "",
  },
  {
    code: "zh-Hant",
    name: "繁体中文",
    prefix: "zh-Hant/",
  },
  {
    code: "en",
    name: "English",
    prefix: "en/",
  },
  {
    code: "ja",
    name: "日本語",
    prefix: "ja/",
  },
];
