import { assertEquals } from "../deps.ts";
import HnItem from "./hn.ts";
import hnExampleJson from "../example/current/1-raw/hackernews/2022/08/10/2022_08_10_en_hn_hackernews_32407873.json" assert {
  type: "json",
};
Deno.test("hn parse raw json #1", () => {
  const item = new HnItem(hnExampleJson);
  assertEquals(item.getPublishedYear(), "2022");
  assertEquals(item.getId(), "32407873");
  assertEquals(
    item.getItemIdentifier(),
    "en_hn__32407873",
  );
  assertEquals(item.getTitle(), "Reddit’s database has two tables (2012)");
});
