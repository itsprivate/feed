import D from "./d/mod.ts";
import { delay } from "./deps.ts";
import { toZhHant } from "./to-zh-hant.ts";
import { Language } from "./d/interface.ts";
export default class Translation {
  constructor() {
  }

  async translate(
    sentence: string,
    sourceLanguage: string,
    targetLanguages: string[],
  ): Promise<Record<string, string>> {
    const d = new D();
    // console.log("sourceLanguage", sourceLanguage);
    // console.log("targetLanguages", targetLanguages);
    const results: Record<string, string> = {};
    for (
      const targetLanguage of targetLanguages.filter((lang) =>
        lang !== "zh-Hant"
      )
    ) {
      await delay(100);
      const result = await d.translateList({
        url: "https://google.com",
        text: [
          sentence,
        ],
        from: sourceLanguage as Language,
        to: targetLanguage as Language,
      });
      results[targetLanguage] = result.text[0];
    }
    if (results["zh-Hans"]) {
      results["zh-Hant"] = toZhHant(results["zh-Hans"]);
    }
    // console.log("results", results);
    return results;
  }
}
