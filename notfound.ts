import { Config } from "./interface.ts";
import { mustache } from "./deps.ts";

export default function (
  template: string,
  config: Config,
  description?: string,
): Response {
  // @ts-ignore: add meta data
  return new Response(mustache.render(template, { description }), {
    status: 404,
    headers: {
      "content-type": "text/html; charset=utf-8",
    },
  });
}
