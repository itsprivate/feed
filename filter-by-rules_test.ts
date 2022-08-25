import filterByRules from "./filter-by-rules.ts";

import TwitterItem from "./adapters/twitter.ts";
import RedditItem from "./adapters/reddit.ts";

import { readJSONFile } from "./util.ts";
import { assertEquals } from "./deps.ts";
import reddit from "./adapters/reddit.ts";
Deno.test("filterByRules #1", async (t) => {
  const tweetItem = await readJSONFile(
    "example/current/1-raw/2022/08/22/en_twitter_1562101617742282752.json",
  );

  const redditItem = await readJSONFile(
    "example/current/1-raw/2022/08/22/en_reddit_test.json",
  );

  await t.step("not filter #1", () => {
    const items = filterByRules([new TwitterItem(tweetItem)], [
      {
        type: "greaterEqual",
        key: "getWeightedScore",
        value: "356",
      },
    ]);
    assertEquals(items.length, 1);
  });

  await t.step("filtered #2", () => {
    const items = filterByRules([new TwitterItem(tweetItem)], [
      {
        type: "greaterEqual",
        key: "getWeightedScore",
        value: "358",
      },
    ]);
    assertEquals(items.length, 0);
  });

  await t.step("filtered #3", () => {
    const items = filterByRules([new RedditItem(redditItem)], [
      {
        type: "greaterEqual",
        key: "getWeightedScore",
        value: "59",
      },
    ]);
    assertEquals(items.length, 0);
  });

  await t.step("filtered #4", () => {
    const items = filterByRules([new RedditItem(redditItem)], [
      {
        type: "greaterEqual",
        key: "getWeightedScore",
        value: "53",
      },
    ]);
    assertEquals(items.length, 1);
  });
});
