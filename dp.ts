import { Deepl as DPro } from "https://esm.sh/immersive-translate@1.0.8";
import { delay } from "./deps.ts";
import { toZhHant } from "./to-zh-hant.ts";
import { Language } from "./d/interface.ts";

const langMap: [Language, string][] = [
  ["auto", "auto"],
  ["zh-CN", "ZH"],
  ["zh-TW", "ZH"],
  ["zh-Hans", "ZH"],
  ["zh", "ZH"],
  ["de", "DE"],
  ["en", "EN"],
  ["es", "ES"],
  ["fr", "FR"],
  ["it", "IT"],
  ["ja", "JA"],
  ["pt", "PT"],
  ["ru", "RU"],
  ["tr", "tr"],
];
export default class Translation {
  /** Translator lang to custom lang */
  private static readonly langMap = new Map(langMap);

  /** Custom lang to translator lang */
  private static readonly langMapReverse = new Map(
    langMap.map(([translatorLang, lang]) => [lang, translatorLang]),
  );

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
      // @ts-ignore: it's ok
      const sourceLanguageRemote = Translation.langMap.get(sourceLanguage) ||
        sourceLanguage;
      // @ts-ignore: it's ok
      const targetLanguageRemote = Translation.langMap.get(targetLanguage) ||
        targetLanguage;
      console.log(
        "sentence",
        sentence,
        sourceLanguageRemote,
        targetLanguageRemote,
      );

      const result = await d.translateText(
        sentence,
        sourceLanguageRemote as Language,
        targetLanguageRemote as Language,
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
