const isDev = () => {
  return Deno.env.get("DEV") !== "0" && Deno.env.get("PROD") !== "1";
};
let handledItemsCount = 4;
if (Deno.env.get("FILES")) {
  handledItemsCount = Number(Deno.env.get("FILES"));
}
export const DEV_MODE_HANDLED_ITEMS = handledItemsCount;

let translatedItemsPerPage = isDev() ? 1 : 100;
if (Deno.env.get("TRANSLATED_ITEMS_PER_PAGE")) {
  translatedItemsPerPage = Number(Deno.env.get("TRANSLATED_ITEMS_PER_PAGE"));
}
export const TRANSLATED_ITEMS_PER_PAGE = translatedItemsPerPage;
export const MAX_ITEMS_PER_PAGE = 200;

export const ROOT_DOMAIN = "buzzing.cc";
export const archiveSubDomain = "i";
export const indexSubDomain = "www";
