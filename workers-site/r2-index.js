import { TARGET_SITE_LANGUAEGS } from "../common.js";

export default {
  async fetch(request, env, _ctx) {
    switch (request.method) {
      case "GET": {
        let subsiteIdentifier = getSubsiteIdentifier(request.url);
        subsiteIdentifier = "reddit";
        let bucketName = "MY_BUCKET";
        // check old url and redirect to new url
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
            newUrl.hostname = newHostname;
            // return new Response(newUrl, {
            //   status: 200,
            // });
            return Response.redirect(newUrl.href, 301);
          } else if (subpath === "issues") {
            const issueNumber = fields[2];
            const issueMap = getIssueMap(subsiteIdentifier);
            const issue = issueMap[issueNumber];
            if (issue) {
              const newUrl = new URL(url);
              newUrl.pathname =
                "/" +
                language.prefix +
                subsiteIdentifier +
                "/issues/" +
                issue +
                "/";
              newUrl.hostname = newHostname;
              return Response.redirect(newUrl.href, 302);
            } else {
              return new Response("Not Found Issue, 404", {
                status: 404,
              });
            }
            // calculate new issue
          }
        }
        const fileKey =
          "public/" + subsiteIdentifier + "/" + urlToFilePath(request.url);
        console.log("fileKey", fileKey);
        const object = await env[bucketName].get(fileKey);
        if (object === null) {
          return new Response("File " + fileKey + " Not Found", {
            status: 404,
          });
        }

        const headers = new Headers();
        object.writeHttpMetadata(headers);
        headers.set("etag", object.httpEtag);
        return new Response(object.body, {
          headers,
        });
      }

      default: {
        return new Response("Method Not Allowed", {
          status: 405,
          headers: {
            Allow: "PUT, GET, DELETE",
          },
        });
      }
    }
  },
};

function getSubsiteIdentifier(url) {
  const urlObj = new URL(url);
  return urlObj.hostname.split(".")[0];
}

export const urlToFilePath = (url) => {
  const urlObj = new URL(url);
  const pathname = urlObj.pathname;

  let filepath = pathname;

  if (pathname === "/") {
    filepath = "index.html";
  } else {
    filepath = pathname.slice(1);
  }
  if (filepath.endsWith("/")) {
    filepath += "index.html";
  } else {
    // check is has extension
    const basename = getBasename(filepath);
    if (!basename.includes(".")) {
      if (filepath.endsWith("/")) {
        filepath += "index.html";
      } else {
        filepath += "/index.html";
      }
    }
  }

  return filepath;
};

function getBasename(path) {
  return path.split("/").reverse()[0];
}
