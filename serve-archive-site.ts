import { jsonfeedToRSS, posixPath, serve } from "./deps.ts";

import {
  getArchivedBucketName,
  getArchivedFilePath,
  getArchiveS3Bucket,
  isDebug,
  readJSONFile,
  siteIdentifierToUrl,
} from "./util.ts";
import log from "./log.ts";
import { TARGET_SITE_LANGUAEGS } from "./constant.ts";
import feedToHTML from "./feed-to-html.ts";
import itemsToFeed from "./items-to-feed.ts";
import { Feedjson, ItemsJson } from "./interface.ts";
import notfound from "./notfound.ts";
import config from "./config.gen.json" assert { type: "json" };
export default async function serveSite(port = 8000) {
  const isLocal = Deno.env.get("LOCAL") === "1";
  if (isDebug()) {
    log.setLevel("debug");
  }
  // build index.html
  const indexTemplateString = await Deno.readTextFile(
    "./templates/index.html",
  );
  const notfoundTemplateString = await Deno.readTextFile(
    "./templates/404.html",
  );
  const handler = async (request: Request): Promise<Response> => {
    if (addTrailSlash(request.url)) {
      return addTrailSlash(request.url)!;
    }

    const routeInfo = parseUrl(request.url);
    log.debug(`routeInfo`, routeInfo);
    const url = routeInfo.url;
    const language = routeInfo.language;

    const pattern = new URLPattern({
      pathname: "/:siteIdentifier/:type/*",
    });
    // console.log("newUrl.pathname", newUrl.pathname);
    const parsedRoute = pattern.exec(url);
    log.debug("parsedRoute", parsedRoute);
    if (!parsedRoute) {
      return notfound(notfoundTemplateString, config);
    }
    const parsedPathnameGroups = parsedRoute.pathname.groups;

    const siteIdentifier = parsedPathnameGroups.siteIdentifier;
    const type = parsedPathnameGroups.type;
    const value = parsedPathnameGroups[0];
    if (type === "tags" || type === "issues" || type === "archive") {
      // get items.json path
      let pageType = "index.html";
      let relativeItemsPath = "";
      if (value.endsWith("/")) {
        relativeItemsPath = `${type}/${value}items.json`;
      } else {
        // replace .html with .json
        const basename = posixPath.basename(value);
        const parentPath = posixPath.dirname(value);
        pageType = basename;

        relativeItemsPath = `${type}/${parentPath}/items.json`;
      }

      let itemsJson: ItemsJson | null = null;
      const filePath = getArchivedFilePath(siteIdentifier, relativeItemsPath);
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
        // merge with site items
        let feedjson = itemsToFeed(
          relativeItemsPath,
          itemsJson,
          siteIdentifier,
          language.code,
          config,
          {
            isArchive: true,
          },
        );

        let currentSiteFeedJson: Feedjson | null = null;
        try {
          const feedJsonpath = siteIdentifierToUrl(
            siteIdentifier,
            "/feed.json",
            config,
          );
          const feedJsonResponse = await fetch(feedJsonpath);
          currentSiteFeedJson = await feedJsonResponse.json();
          console.log("feedJsonpath", feedJsonpath);
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
        } else if (pageType === "rss.xml") {
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
    } else {
      return notfound(notfoundTemplateString, config, "Unknown path");
    }
  };
  log.info(
    `HTTP webserver running. Access it at: http://localhost:${port}/`,
  );
  serve(handler, { port });
}

function parseUrl(urlStr: string) {
  const url = new URL(urlStr);
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

  // support version lite

  const versionField = pathname.split("/")[1];
  let version = "current";
  if (versionField === "lite") {
    version = "lite";
    console.log("pathname", pathname);
    pathname = pathname.slice("/lite".length);
    // add start slash
    if (!pathname.startsWith("/")) {
      pathname = "/" + pathname;
    }
  }

  const newUrl = new URL(url);
  newUrl.pathname = pathname;

  return {
    language: language,
    pathname: pathname,
    url: newUrl.href,
    version: version,
  };
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
