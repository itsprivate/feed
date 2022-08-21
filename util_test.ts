import { assertEquals } from "https://deno.land/std@0.151.0/testing/asserts.ts";
import {
  isWeekBiggerThan,
  loadS3ArchiveFile,
  resortArchiveKeys,
  slug,
  weekOfYear,
} from "./util.ts";

Deno.test("loadS3ArchiveFile #1", async () => {
  if (Deno.env.get("ARCHIVE_SECRET_ACCESS_KEY")) {
    await loadS3ArchiveFile("test/test.json");
    console.log("done");
  }
});

Deno.test("loadS3ArchiveFile #2", async () => {
  if (Deno.env.get("ARCHIVE_SECRET_ACCESS_KEY")) {
    await loadS3ArchiveFile("hackernews/tags/job/items.json");
    console.log("done");
  }
});

Deno.test("resort archive keys #3", () => {
  const result = resortArchiveKeys([
    "2022/31",

    "2022/2",
    "2022/1",
    "2022/52",
    "2021/52",
    "2021/50",
    "2021/49",
    "2021/47",
    "2021/2",
    "2021/1",
    "2021/53",
    "2020/53",
    "2020/52",
    "2020/51",
    "2020/50",
    "2020/49",
    "2022/3",
    "2020/48",
    "2020/47",
    "2020/46",
  ]);
  assertEquals(result, [
    "2022/52",
    "2022/31",
    "2022/3",
    "2022/2",
    "2022/1",
    "2021/53",
    "2021/52",
    "2021/50",
    "2021/49",
    "2021/47",
    "2021/2",
    "2021/1",
    "2020/53",
    "2020/52",
    "2020/51",
    "2020/50",
    "2020/49",
    "2020/48",
    "2020/47",
    "2020/46",
  ]);
});

Deno.test("isWeekBiggerThan #4", () => {
  const now = new Date("2021-01-01T00:00:00.000Z");
  const itemDate = new Date("2020-12-31T00:00:00.000Z");
  assertEquals(isWeekBiggerThan(now, itemDate), false);
});
Deno.test("isWeekBiggerThan #4.1", () => {
  const now = new Date("2022-01-03T00:00:00.000Z");
  const itemDate = new Date("2022-01-02T00:00:00.000Z");
  assertEquals(isWeekBiggerThan(now, itemDate), true);
});
Deno.test("weekOfYear #5", () => {
  const date = new Date("2020-12-31T00:00:00.000Z");
  assertEquals(weekOfYear(date), {
    year: 2020,
    week: 53,
    number: 202053,
    path: "2020/53",
  });
});
Deno.test("weekOfYear #6", () => {
  const date = new Date("2021-01-01T00:00:00.000Z");
  assertEquals(weekOfYear(date), {
    year: 2020,
    week: 53,
    number: 202053,
    path: "2020/53",
  });
});
Deno.test("weekOfYear #7", () => {
  const date = new Date("2021-01-04T00:00:00.000Z");
  assertEquals(weekOfYear(date), {
    year: 2021,
    week: 1,
    number: 202101,
    path: "2021/1",
  });
});
Deno.test("weekOfYear #8", () => {
  const date = new Date("2021-12-31T00:00:00.000Z");
  assertEquals(weekOfYear(date), {
    year: 2021,
    week: 52,
    number: 202152,
    path: "2021/52",
  });
});
Deno.test("weekOfYear #9", () => {
  const date = new Date("2022-01-03T00:00:00.000Z");
  assertEquals(weekOfYear(date), {
    year: 2022,
    week: 1,
    number: 202201,
    path: "2022/1",
  });
});
Deno.test("weekOfYear #9", () => {
  const date = new Date("2022-01-07T00:00:00.000Z");
  assertEquals(weekOfYear(date), {
    year: 2022,
    week: 1,
    number: 202201,
    path: "2022/1",
  });
});
Deno.test("weekOfYear #10", () => {
  const date = new Date("2022-01-09T00:00:00.000Z");
  assertEquals(weekOfYear(date), {
    year: 2022,
    week: 1,
    number: 202201,
    path: "2022/1",
  });
});
Deno.test("weekOfYear #10", () => {
  const date = new Date("2022-12-31T00:00:00.000Z");
  assertEquals(weekOfYear(date), {
    year: 2022,
    week: 52,
    number: 202252,
    path: "2022/52",
  });
});
Deno.test("weekOfYear #11", () => {
  const date = new Date("2022-01-01T00:00:00.000Z");
  assertEquals(weekOfYear(date), {
    year: 2021,
    week: 52,
    number: 202152,
    path: "2021/52",
  });
});

Deno.test("weekOfYear #12", () => {
  const date = new Date("2021-12-31T14:20:28.000Z");
  assertEquals(weekOfYear(date), {
    year: 2021,
    week: 52,
    number: 202152,
    path: "2021/52",
  });
});

Deno.test("weekOfYear #13", () => {
  const date = new Date("2022-05-12T14:20:28.000Z");
  assertEquals(weekOfYear(date), {
    year: 2022,
    week: 19,
    number: 202219,
    path: "2022/19",
  });
});

Deno.test("slug #14", () => {
  assertEquals(slug("Hello World"), "hello-world");
  assertEquals(slug("KidsAreFuckingStupid"), "kids-are-fucking-stupid");
});
