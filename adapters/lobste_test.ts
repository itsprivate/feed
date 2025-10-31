import { assertEquals } from "../deps.ts";
import Item from "./lobste.ts";
import { RSSItem } from "./rss.ts";
import exampleJson from "../example/current/1-raw/2022/08/22/en_lobste_test.json" with { type: "json" };
Deno.test("hn parse raw json #1", () => {
  const item = new Item(exampleJson as unknown as RSSItem);
  assertEquals(item.getId(), "q8wxrn");
  assertEquals(item.getTags(), ["vim", "release"]);
});
