// import { Deepl as DPro } from "https://esm.sh/immersive-translate@1.0.8";
import { isMock } from "./util.ts";
import { delay } from "./deps.ts";
import { toZhHant } from "./to-zh-hant.ts";
import { Language } from "./d/interface.ts";
import { request } from "./util.ts";

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
// const d = new DPro(Deno.env.get("IM_DEEPL_AUTH_KEY"));

/**
 * A translate api failure.
 *
 * `permanent` marks a failure the payload itself caused, so retrying the same
 * sentence will always fail the same way. Transient failures (5xx, timeouts,
 * rate limits) are worth retrying on the next run.
 */
export class TranslateError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly permanent: boolean,
  ) {
    super(message);
    this.name = "TranslateError";
  }
}

export default class Translation {
  /** Translator lang to custom lang */
  private static readonly langMap = new Map(langMap);

  /** Custom lang to translator lang */
  private static readonly langMapReverse = new Map(
    langMap.map(([translatorLang, lang]) => [lang, translatorLang]),
  );

  constructor() {}

  async translate(
    sentence: string,
    sourceLanguage: string,
    targetLanguages: string[],
  ): Promise<Record<string, string>> {
    if (isMock()) {
      const response: Record<string, string> = {};
      for (const targetLanguage of targetLanguages) {
        response[targetLanguage] = sentence;
      }
      return response;
    }
    // console.log("sourceLanguage", sourceLanguage);
    // console.log("targetLanguages", targetLanguages);
    const results: Record<string, string> = {};
    for (const targetLanguage of targetLanguages.filter(
      (lang) => lang !== "zh-Hant",
    )) {
      await delay(20);
      // @ts-ignore: it's ok
      const sourceLanguageRemote =
        // @ts-ignore: it's ok
        Translation.langMap.get(sourceLanguage) || sourceLanguage;
      // @ts-ignore: it's ok
      const targetLanguageRemote =
        // @ts-ignore: it's ok
        Translation.langMap.get(targetLanguage) || targetLanguage;

      // const result = await d.translateText(
      //   sentence,
      //   sourceLanguageRemote as Language,
      //   targetLanguageRemote as Language
      // );

      const translateUrl = Deno.env.get("DEEPL_TRANSLATE_URL");
      if (!translateUrl) {
        throw new Error("DEEPL_TRANSLATE_URL environment variable is not set");
      }
      const res = await fetch(
        translateUrl,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            token: Deno.env.get("IM_DEEPL_TOKEN")!,
          },
          body: JSON.stringify({
            text: [sentence],
            source_lang: sourceLanguageRemote,
            target_lang: targetLanguageRemote,
          }),
        },
      );
      const contentType = res.headers.get("content-type") ?? "";
      if (!res.ok || !contentType.includes("application/json")) {
        const body = (await res.text()).slice(0, 200);
        // the api never answers with html, so 403 + text/html is a WAF rejecting
        // the payload itself -- e.g. a title containing `/etc/hosts`, which reads
        // as a path traversal attempt. Retrying that sentence never helps.
        const isBlockedByWAF = res.status === 403 &&
          contentType.includes("text/html");
        throw new TranslateError(
          `translate failed: HTTP ${res.status} ${contentType} ${body}`,
          res.status,
          isBlockedByWAF,
        );
      }
      const result = await res.json();
      if (result && result.translations && result.translations[0]) {
        if (result.translations[0].text) {
          results[targetLanguage] = result.translations[0].text;
        } else {
          results[targetLanguage] = sentence;
        }
      } else {
        throw new TranslateError(JSON.stringify(result), res.status, false);
      }
    }
    if (results["zh-Hans"]) {
      results["zh-Hant"] = toZhHant(results["zh-Hans"]);
    }
    // console.log("results", results);
    return results;
  }
}
