// import { jsonfeedToRSS, path, serve } from "../deps.ts";
// import { path, serve } from "../deps.ts";
import { serve } from "https://deno.land/std@0.152.0/http/server.ts";
import * as path from "https://deno.land/std@0.151.0/path/mod.ts";

// import {
// getArchivedBucketName,
// getArchivedFilePath,
// getArchiveS3Bucket,
// getConfigSync,
// isDev,
// readJSONFile,
// writeJSONFile,
// } from "../util.ts";
import log from "../log.ts";
import { TARGET_SITE_LANGUAEGS } from "../constant.ts";
// import feedToHTML from "../feed-to-html.ts";
// import itemsToFeed from "../items-to-feed.ts";
import { ItemsJson } from "../interface.ts";
export default function serveSite() {
  // const config = getConfigSync();

  const handler = async (request: Request): Promise<Response> => {
    const url = new URL(request.url);
    // get language code
    const langField = url.pathname.split("/")[1];
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

    // get siteIdentifier
    const fields = pathname.split("/");

    const siteIdentifier = fields[1];
    if (!siteIdentifier) {
      return Promise.resolve(
        new Response("Not Found", {
          status: 404,
        }),
      );
    }

    const relativePathname = fields.slice(2).join("/");
    let relativeItemsPath = relativePathname;
    let type = "index";
    if (!relativeItemsPath.endsWith("/")) {
      const basename = path.basename(relativeItemsPath);
      if (!basename.includes(".")) {
        relativeItemsPath = relativeItemsPath + "/items.json";
      } else {
        if (basename === "feed.json") {
          type = "feedjson";
          relativeItemsPath = path.dirname(relativeItemsPath) + "/items.json";
        } else if (basename === "rss.xml") {
          type = "rssxml";
          relativeItemsPath = path.dirname(relativeItemsPath) + "/items.json";
        } else {
          // not found
          return Promise.resolve(
            new Response("Not Found", {
              status: 404,
            }),
          );
        }
      }
    } else if (
      relativeItemsPath.startsWith("/")
    ) {
      relativeItemsPath = relativeItemsPath.slice(1);
    }

    const relativeBasename = path.basename(relativeItemsPath);
    if (!relativeBasename.includes(".")) {
      relativeItemsPath = relativeItemsPath + "items.json";
    }
    let itemsJson: ItemsJson | null = null;
    // const filePath = getArchivedFilePath(siteIdentifier, relativeItemsPath);
    const filePath = relativeItemsPath;
    return Promise.resolve(
      new Response("file path" + filePath, {
        status: 200,
      }),
    );
    // if (isDev()) {
    //   // get file
    //   try {
    //     itemsJson = await readJSONFile(filePath);
    //   } catch (_e) {
    //     // 404
    //     return Promise.resolve(
    //       new Response("Not Found", {
    //         status: 404,
    //       }),
    //     );
    //   }
    // } else {
    //   // read from remote
    //   const bucket = getArchivedBucketName();
    //   console.log("bucket", bucket);
    //   const s3Bucket = await getArchiveS3Bucket(bucket);
    //   const s3Object = await s3Bucket.getObject(filePath);
    //   if (s3Object) {
    //     const { body } = s3Object;
    //     itemsJson = await new Response(body).json();
    //   }
    // }
    // if (itemsJson) {
    //   const feedjson = itemsToFeed(
    //     relativeItemsPath,
    //     itemsJson,
    //     siteIdentifier,
    //     language.code,
    //     config,
    //     {
    //       isArchive: true,
    //     },
    //   );
    //   let type = "feedjson";
    //   // TODO: write temp json
    //   // await writeJSONFile("temp.json", feedjson);
    //   if (type === "feedjson") {
    //     return Promise.resolve(
    //       new Response(JSON.stringify(feedjson), {
    //         headers: {
    //           "Content-Type": "application/json",
    //         },
    //       }),
    //     );
    //   } else if (type === "rssxml") {
    //     // @ts-ignore: npm module
    //     const rssOutput = jsonfeedToRSS(feedjson, {
    //       language: feedjson.language,
    //     });
    //     return Promise.resolve(
    //       new Response(rssOutput, {
    //         headers: {
    //           "Content-Type": "application/xml",
    //         },
    //       }),
    //     );
    //   }
    //   const html = feedToHTML(feedjson, config);
    //   return new Response(html, {
    //     status: 200,
    //     headers: {
    //       "content-type": "text/html; charset=utf-8",
    //     },
    //   });
    // } else {
    //   return Promise.resolve(
    //     new Response("Not Found", {
    //       status: 404,
    //     }),
    //   );
    // }
  };
  const port = Number(Deno.env.get("PORT") || 8000);
  log.info(
    `HTTP webserver running. Access it at: http://localhost:${port}/`,
  );
  serve(handler);
}

if (import.meta.main) {
  serveSite();
}
