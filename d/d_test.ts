import Translate from "./mod.ts";
import log from "../../log.ts";
import { generateTranslationRequestData } from "./generators.ts";
import splitResult from "./mock/split_result.json" assert { type: "json" };
import { extractSplitSentences, SplittedSentences } from "./extractors.ts";
import { assertEquals } from "../../dev_deps.ts";
Deno.test("translate #1", async () => {
  log.setLevel("debug");
  // const transmart = new Translate({}, {});
  // const result = await transmart.translateList({
  //   text: [
  //     "This week, Qatar will host the final matches of the 2022 World Cup soccer tournament. The Middle Eastern emirate spent huge amounts of money on the event—$220 billion, by some estimates. But as a public relations exercise, that spending may have been wasted: Qatar has drawn widespread criticism for alleged corruption involved in winning hosting rights in the first place and the apparent mistreatment of guest workers who built the stadiums and infrastructure.",
  //     "How stable is Qatar’s economy? How privileged are Qatari citizens compared to their guest workers? And how might climate change affect its economy? Those are a few of the questions that came up in my recent conversation with Foreign Policy economics columnist Adam Tooze on the podcast we co-host, Ones and Tooze. What follows is an excerpt, edited for length and clarity.",
  //   ],
  //   from: "en",
  //   to: "zh-CN",
  //   url: "https://google.com",
  // });
});

Deno.test("translate #2", () => {
  const res = splitResult as unknown as SplittedSentences;
  const res2 = generateTranslationRequestData(
    res.result.lang.detected,
    "zh",
    extractSplitSentences(res),
  );
  assertEquals(res2.params.jobs.length, 9);
});

Deno.test("translate #3", async () => {
  log.setLevel("debug");
  // const transmart = new Translate({}, {});
  // const result = await transmart.translateList({
  //   text: [
  //     "This week, Qatar will host the final matches of the 2022 World Cup soccer tournament. The Middle Eastern emirate spent huge amounts of money on the event—$220 billion, by some estimates. But as a public relations exercise, that spending may have been wasted: Qatar has drawn widespread criticism for alleged corruption involved in winning hosting rights in the first place and the apparent mistreatment of guest workers who built the stadiums and infrastructure.",
  //     "How stable is Qatar’s economy? How privileged are Qatari citizens compared to their guest workers? And how might climate change affect its economy? Those are a few of the questions that came up in my recent conversation with Foreign Policy economics columnist Adam Tooze on the podcast we co-host, Ones and Tooze. What follows is an excerpt, edited for length and clarity.",
  //     "Sadly, as we see in the world today, it turns out that fascism is the most optimized ideology available given the limited cognitive bandwidth constraints of a 280-character post. This is because the answer is always simple with fascism: generally a death threat towards the marginalized group of the day will do just fine, which easily fits into 280 characters: “Storm the capitol building!”? “Hang Mike Pence!”? Yep, even congressional members and vice presidents can be marginalized under the right circumstances, and it’s under 280 characters.",
  //     "Very easy answer. A short time ago, historically, before birth control, antibiotics and NICUs, a huge portion of most women’s lives was consumed with pregnancy, birthing, dying during childbirth, having shit tons of children because high infant mortality and no birth control— that takes out your 16-40yo female demographic who would otherwise be having a say in leadership/positions of power. Meanwhile all the same men in that demographic who were not constantly stuck with this exhausting deadly job were traipsing around playing war and king and big boss with all their free time for thousands of years and a societal structure was created favoring these roles. Now that the playing field has slowly, finally evened out some in the past 100 years or so there is not surprisingly a LOT of catching up to do. ",
  //     " Chinese people are not stupid, they are not incapable of distinguishing right from wrong, it’s just that the whole environment of speech is so unfair that only one voice is allowed. I am optimistic that most people will be able to distinguish between right and wrong within a year’s time if they are allowed to compete fairly.",
  //   ],
  //   from: "en",
  //   to: "zh-CN",
  //   url: "https://google.com",
  // });
});
Deno.test("translate #4", async () => {
  log.setLevel("debug");
  // const transmart = new Translate({}, {});
  // const result = await transmart.translateList({
  //   text: [
  //     "This week, Qatar will host the final matches of the 2022 World Cup soccer tournament.",
  //     "How stable is Qatar’s economy?",
  //   ],
  //   from: "en",
  //   to: "zh-CN",
  //   url: "https://google.com",
  // });
});
