// from <https://github.com/un-ts/deeplx>
import { translate } from "./api.ts";
import { SourceLanguage, TargetLanguage } from "./settings.ts";
import type {
  Language,
  TranslationGeneralConfig,
  TranslationListPayload,
  TranslationListResult,
  TranslationPayload,
  TranslationResult,
  TransmartDetectLanguageResponse,
  TransmartListResponse,
  TransmartResponse,
} from "./interface.ts";
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

export default class D {
  /** Translator lang to custom lang */
  private static readonly langMap = new Map(langMap);

  /** Custom lang to translator lang */
  private static readonly langMapReverse = new Map(
    langMap.map(([translatorLang, lang]) => [lang, translatorLang]),
  );

  maxTextGroupLength = 3;
  maxTextLength = 800;
  isSupportList = true;
  constructor() {
  }
  async translateList(
    payload: TranslationListPayload,
  ): Promise<TranslationListResult> {
    const { text, to, from } = payload;
    const result = await translate(
      text,
      D.langMap.get(to) as TargetLanguage,
      D.langMap.get(from) as SourceLanguage,
    );

    return {
      text: result.text,
      from: D.langMapReverse.get(result.from)!,
      to: D.langMapReverse.get(result.to)!,
    };
  }
}
