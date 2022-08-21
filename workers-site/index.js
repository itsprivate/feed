import {
  getAssetFromKV,
  mapRequestToAsset,
  NotFoundError,
  MethodNotAllowedError,
} from "@cloudflare/kv-asset-handler";
import manifestJSON from "__STATIC_CONTENT_MANIFEST";
import { TARGET_SITE_LANGUAEGS } from "../common.js";
const assetManifest = JSON.parse(manifestJSON);

export default {
  async fetch(request, env, ctx) {
    // check old url and redirect to new url
    const url = new URL(request.url);
    const subsiteIdentifier = getSubsiteIdentifier(url);

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
    // check subpath
    const fields = pathname.split("/");
    if (fields.length > 1) {
      const subpath = fields[1];
      if (subpath === "tags") {
        // redirect to new url
        const newUrl = new URL(url);

        newUrl.pathname =
          "/" +
          language.prefix +
          subsiteIdentifier +
          "/tags/" +
          fields.slice(2).join("/");
        newUrl.hostname = "i.buzzing.cc";
        // return new Response(newUrl, {
        //   status: 200,
        // });
        return Response.redirect(newUrl.href, 302);
      }
    }

    try {
      return await getAssetFromKV(
        {
          request,
          waitUntil(promise) {
            return ctx.waitUntil(promise);
          },
        },
        {
          ASSET_NAMESPACE: env.__STATIC_CONTENT,
          ASSET_MANIFEST: assetManifest,
          mapRequestToAsset: customKeyModifier,
        }
      );
    } catch (e) {
      if (e instanceof NotFoundError) {
        // ...
        return new Response("Not Found", { status: 404 });
      } else if (e instanceof MethodNotAllowedError) {
        // ...
        return new Response("Method Not Allowed", {
          status: 405,
          headers: {
            Allow: "GET, HEAD",
          },
        });
      } else {
        return new Response("An unexpected error occurred", { status: 500 });
      }
    }
  },
};

function getSubsiteIdentifier(url) {
  const urlObj = new URL(url);
  let subsiteIdentifier = urlObj.hostname.split(".")[0];
  if (subsiteIdentifier.startsWith("dev-")) {
    subsiteIdentifier = subsiteIdentifier.slice(4);
  }
  return subsiteIdentifier;
}
const customKeyModifier = (request) => {
  const url = request.url;
  //custom key mapping optional
  const subsiteIdentifier = getSubsiteIdentifier(url);

  const urlObj = new URL(url);
  urlObj.pathname = "/" + subsiteIdentifier + urlObj.pathname;
  return mapRequestToAsset(new Request(urlObj.href, request));
};
