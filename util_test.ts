import { assertEquals } from "./deps.ts";
import {
  formatBeijing,
  formatNumber,
  getConfig,
  getDuplicatedFiles,
  getFullDay,
  getFullMonth,
  isDev,
  isMock,
  isWeekBiggerThan,
  liteUrlToUrl,
  loadS3ArchiveFile,
  parseItemIdentifier,
  resortArchiveKeys,
  slug,
  startDateOfWeek,
  weekOfYear,
  weekToRange,
} from "./util.ts";

Deno.test("loadS3ArchiveFile #1", async () => {
  if (Deno.env.get("AWS_SECRET_ACCESS_KEY")) {
    await loadS3ArchiveFile("test/test.json");
  }
});

Deno.test("loadS3ArchiveFile #2", async () => {
  if (Deno.env.get("AWS_SECRET_ACCESS_KEY")) {
    await loadS3ArchiveFile("hackernews/tags/job/items.json");
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

Deno.test("isDev #15", () => {
  assertEquals(isDev(), true);
});

Deno.test("isMock #17", () => {
  assertEquals(isMock(), true);
});
Deno.test("isMock #171", () => {
  Deno.env.set("MOCK", "0");
  assertEquals(isMock(), false);
});
Deno.test("isMock #17", () => {
  Deno.env.set("PROD", "1");
  assertEquals(isMock(), false);
});
Deno.test("isDev #16", () => {
  Deno.env.set("PROD", "1");
  assertEquals(isDev(), false);
});

Deno.test("formatNumber #17", () => {
  const result = formatNumber(123422222);
  assertEquals(result, "123M");
});

Deno.test("format Number #18", () => {
  const result = formatNumber(222);
  assertEquals(result, "222");
});

Deno.test("format Number #19", () => {
  const result = formatNumber(4222);
  assertEquals(result, "4.2K");
});

Deno.test("typescript ? #21", () => {
  const a: {
    b: {
      c: number;
      e?: number;
    };
  } = {
    "b": {
      "c": 1,
    },
  };
  const d = a.b?.c;
  assertEquals(d, 1);
  const e = a.b?.e;
  assertEquals(e, undefined);
});
Deno.test("regex #22", () => {
  const a = "&uarr;18 points";

  const regex = /[^0-9]*(\d+?)[^0-9]+/;

  const result = a.match(regex);

  assertEquals(result![1], "18");
});
Deno.test("slug #23", () => {
  assertEquals(slug("中文标签"), "zhong-wen-biao-qian");
  assertEquals(slug("中 English 结合标签"), "zhong-english-jie-he-biao-qian");

  assertEquals(slug("KidsAreFuckingStupid"), "kids-are-fucking-stupid");
});

Deno.test("get full date #24", () => {
  const str = "2021-01-15T15:58:50.000Z";
  const date = new Date(str);
  const fullMonth = getFullMonth(date);
  const fullDay = getFullDay(date);
  assertEquals(fullMonth, "01");
  assertEquals(fullDay, "15");
});

Deno.test("getDuplicatedFiles #25", () => {
  const removedFiles = getDuplicatedFiles(
    [
      "en_reddit_2022_08_26__test1.json",
      "en_reddit_2022_08_24__test1.json",
      "en_reddit_2022_08_26__test2.json",
    ],
    [
      "en_reddit_2022_08_22__test2.json",
      "en_reddit_2022_08_23__test1.json",
      "en_reddit_2022_08_22__test3.json",
    ],
  );
  assertEquals(removedFiles, [
    "en_reddit_2022_08_22__test2.json",
    "en_reddit_2022_08_23__test1.json",
  ]);
});

Deno.test("url format #26", () => {
  const a = "https://thecoliving.guide?ref=producthunt";
  const b = new URL(a);
  b.searchParams.delete("ref");
  const c = b.href;
  assertEquals(c, "https://thecoliving.guide/");
});

Deno.test("url format #27", () => {
  const a = "https://thecoliving.guide";
  const b = new URL(a);
  b.searchParams.delete("ref");
  const c = b.href;
  assertEquals(c, "https://thecoliving.guide/");
});

Deno.test("url pattern #28", () => {
  const url = "https://youtu.be/mWx2mSlHWAM";
  const urlPattern = new URLPattern("https://youtu.be/:id");
  const result = urlPattern.exec(url);
  assertEquals(result?.pathname.groups.id, "mWx2mSlHWAM");
});

Deno.test("url pattern #29", () => {
  const url = "https://www.youtube.com/embed/x6sSa5NpqUI?autohide=1&showinfo=0";
  const urlPattern = new URLPattern({
    pathname: "/embed/:id",
  });
  const result = urlPattern.exec(url);
  assertEquals(result?.pathname.groups.id, "x6sSa5NpqUI");
});
Deno.test("url pattern #30", () => {
  const url = "https://youtu.be/LU46FWhLJAs?t=10";
  const urlPattern = new URLPattern({
    pathname: "/:id",
  });
  const result = urlPattern.exec(url);
  assertEquals(result?.pathname.groups.id, "LU46FWhLJAs");
});

Deno.test("url pattern #31", () => {
  const url = "https://youtu.be/DmyqLp6rgss?t=45";
  const urlPattern = new URLPattern({
    pathname: "/:id",
  });
  const result = urlPattern.exec(url);
  assertEquals(result?.pathname.groups.id, "DmyqLp6rgss");
});
Deno.test("slug #32", () => {
  assertEquals(slug("HelloWorld"), "hello-world");
  assertEquals(slug("KidsAre-FuckingStupid"), "kids-are-fucking-stupid");
  assertEquals(slug("I Love-hate you"), "i-love-hate-you");
});

Deno.test("regex #33", () => {
  const summary = "test\nnew line\nsecond".replace(/\n/g, "&lt;br&gt;");
  assertEquals(summary, "test&lt;br&gt;new line&lt;br&gt;second");
});

Deno.test("utc date #34", () => {
  const id = "en_hn_2022_08_22_test";
  const parsed = parseItemIdentifier(id);
  const utcDate = Date.UTC(
    Number(parsed.year),
    Number(parsed.month) - 1,
    Number(parsed.day),
  );
  const date = new Date(utcDate);
  assertEquals(date.getUTCDate(), 22);
});

Deno.test("weekToRange #35", () => {
  const range = weekToRange("2021/1");
  assertEquals(range, "01.04 - 01.11");
});

Deno.test("formatBeijing #36", () => {
  const date = new Date(Date.UTC(2021, 0, 1, 18));
  const str = formatBeijing(date, "yyyy-MM-dd HH:mm");
  assertEquals(str, "2021-01-02 02:00");
});

Deno.test("lite url to url #37", async () => {
  const config = await getConfig();

  const url = liteUrlToUrl(
    "https://i.buzzing.cc/zh-Hant/lite/hn/posts/2022/42/en_hn_2022_10_18__33239146/",
    config.versions,
    config.languages,
  );
  assertEquals(
    url,
    "https://i.buzzing.cc/zh-Hant/hn/posts/2022/42/en_hn_2022_10_18__33239146/",
  );
});
Deno.test("lite url to url", async () => {
  const config = await getConfig();

  const url = liteUrlToUrl(
    "https://i.buzzing.cc/lite/hn/posts/2022/42/en_hn_2022_10_18__33239146/",
    config.versions,
    config.languages,
  );
  assertEquals(
    url,
    "https://i.buzzing.cc/hn/posts/2022/42/en_hn_2022_10_18__33239146/",
  );
});
