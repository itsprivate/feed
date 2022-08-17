import { serve, serveDir, serveFile } from "../deps.ts";

import { getDistPath } from "../util.ts";
import log from "../log.ts";
export default function serveSite(domain: string, port: number) {
  const BASE_PATH = getDistPath() + "/" + domain;
  const handler = (request: Request): Promise<Response> => {
    const url = new URL(request.url);
    const path = url.pathname;

    let filepath = path;

    if (path === "/") {
      filepath = "index.html";
    } else {
      filepath = path.slice(1);
    }
    // check is exists
    const file = Deno.statSync(BASE_PATH + "/" + filepath);
    if (file.isFile) {
      return serveFile(request, BASE_PATH + "/" + filepath);
    } else if (file.isDirectory) {
      if (!filepath.endsWith("/")) {
        filepath = filepath + "/";
      }
      return serveFile(request, BASE_PATH + "/" + filepath + "index.html");
    } else {
      // 404
      return Promise.resolve(
        new Response("Not Found", {
          status: 404,
        }),
      );
    }
  };
  log.info(
    `HTTP webserver running. Access it at: http://localhost:${port}/`,
  );
  serve(handler, { port });
}
