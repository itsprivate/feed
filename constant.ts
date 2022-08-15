const isDev = () => {
  return Deno.env.get("DEV") === "1";
};
export const DEV_MODE_HANDLED_ITEMS = 4;
export const TRANSLATED_ITEMS_PER_PAGE = isDev() ? 2 : 100;
export const MAX_ITEMS_PER_PAGE = isDev() ? 3 : 1000;
export const TARGET_SITE_LANGUAEGS = [{
  code: "zh-Hans",
  name: "简体中文",
  prefix: "",
}];
