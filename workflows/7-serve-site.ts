import { serve, serveDir, serveFile } from "../deps.ts";
import { getDistPath } from "../util.ts";
export default async function serveSite(domain: string) {
  const port = Number(Deno.env.get("PORT") || "8000");
  const BASE_PATH = getDistPath() + "/" + domain;
  console.log("BASE_PATH", BASE_PATH);
  const handler = (request: Request): Promise<Response> => {
    const url = new URL(request.url);
    const path = url.pathname;
    if (path === "/") {
      return serveFile(request, BASE_PATH + "/index.html");
    }

    return serveDir(request, {
      fsRoot: BASE_PATH,
    });
  };
  console.log(
    `HTTP webserver running. Access it at: http://localhost:${port}/`,
  );
  await serve(handler, { port });
}
