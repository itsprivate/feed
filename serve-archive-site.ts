import { jsonfeedToRSS, posixPath, serve } from "./deps.ts";

import {
  getArchivedBucketName,
  getArchivedFilePath,
  getArchiveS3Bucket,
  getCurrentItemsFilePath,
  isDebug,
  isDev,
  parseArchiveUrl,
  readJSONFile,
  request as fetchRequest,
  siteIdentifierToUrl,
} from "./util.ts";
import log from "./log.ts";
import feedToHTML from "./feed-to-html.ts";
import itemsToFeed from "./items-to-feed.ts";
import {
  Feedjson,
  FormatedItem,
  ItemsJson,
  ParsedArchiveUrl,
} from "./interface.ts";
import notfound from "./notfound.ts";
import config from "./config.gen.json" assert { type: "json" };
export default async function serveSite(port = 8000) {
  const isLocal = Deno.env.get("LOCAL") === "1";
  if (isDebug()) {
    log.setLevel("debug");
  }
  // build index.html
  const indexTemplateString = await Deno.readTextFile(
    "./templates/index.html.mu",
  );
  const notfoundTemplateString = await Deno.readTextFile(
    "./templates/404.html",
  );
  const handler = async (request: Request): Promise<Response> => {
    if (addTrailSlash(request.url)) {
      return addTrailSlash(request.url)!;
    }
    let routeInfo: ParsedArchiveUrl | undefined;
    try {
      routeInfo = parseArchiveUrl(
        request.url,
        config.versions,
        config.languages,
      );
    } catch (e) {
      if (e.name === "NotFound") {
        return notfound(notfoundTemplateString, config, e.message);
      } else {
        throw e;
      }
    }
    log.debug("routeInfo", routeInfo);
    const {
      siteIdentifier,
      itemsFilePath: filePath,
      scope,
      pageType,
      language,
      meta,
    } = routeInfo;
    const id = meta?.id;
    let itemsJson: ItemsJson | null = null;
    if (isLocal) {
      // get file
      try {
        itemsJson = await readJSONFile(filePath);
      } catch (_e) {
        // 404
        return notfound(notfoundTemplateString, config, filePath);
      }
    } else {
      // read from remote
      const bucket = getArchivedBucketName();
      const s3Bucket = await getArchiveS3Bucket(bucket);
      const s3Object = await s3Bucket.getObject(filePath);
      if (s3Object) {
        const { body } = s3Object;
        itemsJson = await new Response(body).json();
      }
    }
    if (itemsJson) {
      // if posts, only take posts id
      let postItem: FormatedItem | undefined;
      if (scope === "posts") {
        if (itemsJson.items[id]) {
          postItem = itemsJson.items[id];
          itemsJson.items = {
            [id]: postItem,
          };
        } else {
          return notfound(
            notfoundTemplateString,
            config,
            `${id} not found in ${filePath}`,
          );
        }
      }

      // merge with site items
      let feedjson = itemsToFeed(
        routeInfo.pagePathname,
        itemsJson,
        siteIdentifier,
        routeInfo.language.code,
        config,
        {
          isArchive: true,
          isPost: scope === "posts",
          versionCode: routeInfo.version.code,
        },
      );

      let currentSiteFeedJson: Feedjson | null = null;
      try {
        if (isLocal) {
          const currentSiteItemsJson = await readJSONFile(
            getCurrentItemsFilePath(siteIdentifier),
          );
          currentSiteFeedJson = itemsToFeed(
            "items.json",
            currentSiteItemsJson,
            siteIdentifier,
            language.code,
            config,
          );
        } else {
          const feedJsonpath = siteIdentifierToUrl(
            siteIdentifier,
            "/feed.json",
            config,
          );
          const feedJsonResponse = await fetchRequest(feedJsonpath);
          currentSiteFeedJson = await feedJsonResponse.json();
        }
      } catch (e) {
        log.warn("fail to get current site feed.json", e);
      }
      if (currentSiteFeedJson) {
        feedjson = {
          ...currentSiteFeedJson,
          ...feedjson,
        };
      }

      // let type = "feedjson";
      //  write temp json
      // await writeJSONFile("temp.json", feedjson);
      if (pageType === "feed.json") {
        return Promise.resolve(
          new Response(JSON.stringify(feedjson), {
            headers: {
              "Content-Type": "application/json",
            },
          }),
        );
      } else if (pageType === "feed.xml") {
        // @ts-ignore: npm module
        const rssOutput = jsonfeedToRSS(feedjson, {
          language: feedjson.language,
        });
        return Promise.resolve(
          new Response(rssOutput, {
            headers: {
              "Content-Type": "application/xml",
            },
          }),
        );
      }
      const html = feedToHTML(feedjson, config, indexTemplateString);
      return new Response(html, {
        status: 200,
        headers: {
          "content-type": "text/html; charset=utf-8",
        },
      });
    } else {
      log.info(`Not found ${filePath}`);
      return notfound(notfoundTemplateString, config, filePath);
    }
  };
  log.info(
    `HTTP webserver running. Access it at: http://localhost:${port}/`,
  );
  serve(handler, { port });
}

function addTrailSlash(url: string): Response | null {
  const urlObj = new URL(url);
  if (!urlObj.pathname.endsWith("/")) {
    // if it's a file, don't add slash
    const basename = posixPath.basename(urlObj.pathname);
    if (basename.slice(1).includes(".")) {
      // yes file
      return null;
    } else {
      urlObj.pathname = urlObj.pathname + "/";
      return Response.redirect(urlObj.href, 301);
    }
  } else {
    return null;
  }
}

if (import.meta.main) {
  serveSite();
}
