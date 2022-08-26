import { assertEquals } from "../deps.ts";
import HnItem from "./hn.ts";
import hnExampleJson from "../example/current/1-raw/2022/08/22/en_hn_2022_08_22_32407873.json" assert {
  type: "json",
};
import { identifierToCachedKey } from "../util.ts";
Deno.test("hn parse raw json #1", () => {
  const item = new HnItem(hnExampleJson);
  assertEquals(item.getOriginalPublishedYear(), "2022");
  assertEquals(item.getId(), "32407873");
  assertEquals(
    identifierToCachedKey(item.getItemIdentifier()),
    "en_hn__32407873",
  );
  assertEquals(item.getTitle(), "Reddit’s database has two tables (2012)");
});
