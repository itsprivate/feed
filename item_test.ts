import { assertEquals, assertNotEquals } from "./deps.ts";
import HnItem from "./adapters/hn.ts";
import hnExampleJson from "./example/current/1-raw/2022/08/22/en_hn_2022_08_22_32407873.json" assert {
  type: "json",
};
import { parseItemIdentifier } from "./util.ts";
import ItemAdapter from "./adapters/mod.ts";
const list = [
  {
    class: HnItem,
    originalItem: hnExampleJson,
  },
];
for (const testItem of list) {
  Deno.test("parse item valid #1", async (t) => {
    const item = new testItem.class(testItem.originalItem);
    await t.step(`${item.getType()} id must not empty`, () => {
      assertNotEquals(item.getId(), "");
    });
    // published must initial
    await t.step(`${item.getType()} published must initial`, () => {
      assertNotEquals(item.getOriginalPublishedDate(), new Date(0));
    });

    // published modified must equal
    await t.step(`${item.getType()} published modified must equal`, () => {
      assertEquals(item.getPublishedDay(), item.getPublishedDay());
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
      assertNotEquals(item.getOriginalLanguage(), "");
    });

    // source type must not empty
    await t.step(`${item.getType()} source type must not item`, () => {
      assertNotEquals(item.getType(), "item");
    });
  });
}

Deno.test("parseItemIdentifier #10", () => {
  const parsed = parseItemIdentifier(
    "en_hn_2022_08_26__32407873",
  );
  assertEquals(parsed, {
    type: "hn",
    id: "32407873",
    year: "2022",
    month: "08",
    day: "26",
    language: "en",
  });
});
Deno.test("parseItemIdentifier #11", () => {
  const parsed = parseItemIdentifier(
    "en_hn_2022_08_23___32407873_-1223",
  );
  assertEquals(parsed, {
    type: "hn",
    id: "_32407873_-1223",
    year: "2022",
    month: "08",
    day: "23",
    language: "en",
  });
});

Deno.test("item adapter class name equal with filename #12", () => {
  const adapters = Object.keys(ItemAdapter);
  for (const adapter of adapters) {
    const adapterInstance = new ItemAdapter[adapter](
      {} as unknown,
      "example.com",
    );
    assertEquals(adapter, adapterInstance.getType());
  }
});
