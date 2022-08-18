import { assertEquals } from "../deps.ts";
import HnItem from "./hn.ts";
import hnExampleJson from "../example/current/1-raw/hn/2022/08/10/2022-08-10-en-hn-hackernews.buzzing.cc_32407873.json" assert {
  type: "json",
};

Deno.test("hn parse raw json #1", () => {
  const item = new HnItem(hnExampleJson, "example.com");
  assertEquals(item.getPublishedYear(), "2022");
  assertEquals(item.getId(), "32407873");
  assertEquals(
    item.getItemIdentifier(),
    "2022_08_10_en_hn_example.com__32407873",
  );
  assertEquals(item.getTitle(), "Reddit’s database has two tables (2012)");
});
