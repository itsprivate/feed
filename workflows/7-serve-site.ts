import { serve, serveFile } from "../deps.ts";

import { getDistPath, urlToFilePath } from "../util.ts";
import log from "../log.ts";
export default function serveSite(siteIdentifier: string, port: number) {
  const BASE_PATH = getDistPath() + "/" + siteIdentifier;
  const handler = (request: Request): Promise<Response> => {
    const filepath = urlToFilePath(request.url);
    const localPath = BASE_PATH + "/" + filepath;
    // check if file exists
    let finalPath: string | undefined;
    try {
      const fileInfo = Deno.statSync(localPath);
      if (fileInfo.isFile) {
        finalPath = localPath;
      }
    } catch (e) {
      log.error(e);
    }
    if (finalPath) {
      return serveFile(request, localPath);
    } else {
      return Promise.resolve(new Response("Not Found", { status: 404 }));
    }
  };
  log.info(
    `HTTP webserver running. Access it at: http://localhost:${port}/`,
  );
  serve(handler, { port });
}
