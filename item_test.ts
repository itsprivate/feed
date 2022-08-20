import { assertEquals, assertNotEquals } from "./deps.ts";
import HnItem from "./adapters/hn.ts";
import hnExampleJson from "./example/current/1-raw/hackernews/2022/08/10/2022_08_10_en_hn_hackernews_32407873.json" assert {
  type: "json",
};
import Item from "./item.ts";
const list = [
  {
    class: HnItem,
    originalItem: hnExampleJson,
  },
];
for (const testItem of list) {
  Deno.test("parse item valid #1", async (t) => {
    const item = new testItem.class(testItem.originalItem, "example.com");
    await t.step(`${item.getType()} id must not empty`, () => {
      assertNotEquals(item.getId(), "");
    });
    // published must initial
    await t.step(`${item.getType()} published must initial`, () => {
      assertNotEquals(item.getOriginalPublishedDate(), new Date(0));
    });

    // published modified must equal
    await t.step(`${item.getType()} published modified must equal`, () => {
      assertEquals(item.getPublished(), item.getModified());
    });

    // title mush not empty
    await t.step(`${item.getType()} title must not empty`, () => {
      assertNotEquals(item.getTitle(), "");
    });

    // url must not empty
    await t.step(`${item.getType()} url must not empty`, () => {
      assertNotEquals(item.getUrl(), "");
    });

    // languatge must not empty
    await t.step(`${item.getType()} languatge must not empty`, () => {
      assertNotEquals(item.getLanguage(), "");
    });

    // source type must not empty
    await t.step(`${item.getType()} source type must not item`, () => {
      assertNotEquals(item.getType(), "item");
    });
  });
}

Deno.test("parseItemIdentifier #10", () => {
  const parsed = Item.parseItemIdentifier(
    "2022_08_10_en_hn_example-com__32407873",
  );
  assertEquals(parsed, {
    type: "hn",
    targetSite: "example-com.buzzing.cc",
    targetSiteIdentifier: "example-com",
    id: "32407873",
    year: "2022",
    month: "08",
    day: "10",
    language: "en",
  });
});
Deno.test("parseItemIdentifier #11", () => {
  const parsed = Item.parseItemIdentifier(
    "2022_08_10_en_hn_example-com___32407873_-1223",
  );
  assertEquals(parsed, {
    type: "hn",
    targetSite: "example-com.buzzing.cc",
    targetSiteIdentifier: "example-com",
    id: "_32407873_-1223",
    year: "2022",
    month: "08",
    day: "10",
    language: "en",
  });
});
