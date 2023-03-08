import { Deepl as DPro } from "https://esm.sh/immersive-translate@1.0.8";
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
    const d = new DPro(Deno.env.get("IM_DEEPL_AUTH_KEY"));
    // console.log("sourceLanguage", sourceLanguage);
    // console.log("targetLanguages", targetLanguages);
    const results: Record<string, string> = {};
    for (
      const targetLanguage of targetLanguages.filter((lang) =>
        lang !== "zh-Hant"
      )
    ) {
      await delay(20);
      const result = await d.translateText(
        sentence,
        sourceLanguage as Language,
        targetLanguage as Language,
      );
      console.log("result", result);
      results[targetLanguage] = result.text;
    }
    if (results["zh-Hans"]) {
      results["zh-Hant"] = toZhHant(results["zh-Hans"]);
    }
    // console.log("results", results);
    return results;
  }
}
