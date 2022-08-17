import { serve } from "../deps.ts";
import {
  getArchivedFilePath,
  getConfigSync,
  isDev,
  readJSONFile,
} from "../util.ts";
import log from "../log.ts";
import { TARGET_SITE_LANGUAEGS } from "../constant.ts";
import feedToHTML from "../feed-to-html.ts";
import itemsToFeed from "../items-to-feed.ts";
import { FormatedItem } from "../interface.ts";
export default function serveSite() {
  const config = getConfigSync();
  const handler = async (request: Request): Promise<Response> => {
    const url = new URL(request.url);
    // get language code
    const langField = url.pathname.split("/")[1];
    console.log("langField", langField);
    // check if language code is valid
    let language = TARGET_SITE_LANGUAEGS[0];
    let pathname = url.pathname;
    for (const targetLang of TARGET_SITE_LANGUAEGS) {
      let prefix = targetLang.prefix;
      // remove trailing slash
      if (prefix.endsWith("/")) {
        prefix = prefix.slice(0, -1);
      }
      if (prefix === langField) {
        language = targetLang;
        pathname = url.pathname.slice(targetLang.prefix.length);
        break;
      }
    }

    console.log("pathname", pathname);

    // get domain
    const fields = pathname.split("/");

    console.log("fields", fields);
    const domain = fields[1];
    if (!domain) {
      return Promise.resolve(
        new Response("Not Found", {
          status: 404,
        }),
      );
    }

    const relativePathname = fields.slice(2).join("/");
    let relativeItemsPath = relativePathname;

    if (!relativeItemsPath.endsWith("/")) {
      relativeItemsPath = relativeItemsPath + "/";
    } else if (relativeItemsPath.startsWith("/")) {
      relativeItemsPath = relativeItemsPath.slice(1);
    }
    relativeItemsPath = relativeItemsPath + "items.json";
    let itemsJson: Record<string, FormatedItem> | null = null;
    if (isDev()) {
      const filePath = getArchivedFilePath(domain, relativeItemsPath);
      // get file
      console.log("filePath", filePath);
      try {
        itemsJson = await readJSONFile(filePath) as Record<
          string,
          FormatedItem
        >;
      } catch (_e) {
        // 404
        return Promise.resolve(
          new Response("Not Found", {
            status: 404,
          }),
        );
      }
    }
    if (itemsJson) {
      const feedjson = itemsToFeed(itemsJson, domain, language.code, config);
      const html = feedToHTML(feedjson, config);
      return new Response(html, {
        status: 200,
        headers: {
          "content-type": "text/html; charset=utf-8",
        },
      });
    } else {
      return Promise.resolve(
        new Response("Not Found", {
          status: 404,
        }),
      );
    }
  };
  const port = Number(Deno.env.get("PORT") || 9000);
  log.info(
    `HTTP webserver running. Access it at: http://localhost:${port}/`,
  );
  serve(handler, { port });
}
