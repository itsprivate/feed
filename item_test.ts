import { assertNotEquals } from "./deps.ts";
import HnItem from "./adapters/hn.ts";
import hnExampleJson from "./example/data/1-raw/hn/2022/08/10/2022-08-10-en-hn-hackernews.buzzing.cc_32407873.json" assert {
  type: "json",
};

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
      assertNotEquals(item.getPublishedDate(), new Date(0));
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
