import { API_URL } from "./settings.ts";

import { assertEquals } from "../../dev_deps.ts";

Deno.test("deepl api #1", () => {
  assertEquals(API_URL, "https://www2.deepl.com/jsonrpc");
});
