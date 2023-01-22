export type TranslationTheme =
  | "none"
  | "dashed"
  | "dashedBorder"
  | "dotted"
  | "underline"
  | "mask"
  | "paper"
  | "dividingLine"
  | "highlight"
  | "marker"
  | "blockquote"
  | "weakening"
  | "italic"
  | "bold"
  | "thinDashed";
export type PageStatus = "Original" | "Translated" | "Translating" | "Error";
export type LevelName = "debug" | "info" | "warn" | "error" | "fatal";
export type ElementPlaceholder = string;
export interface MessageRequest {
  method: string;
  data?: unknown;
}

export enum Level {
  Debug = 0,
  Info = 1,
  Warn = 2,
  Error = 3,
  Fatal = 4,
}
export interface RawMessageResponse<T = void> {
  ok: boolean;
  data?: T;
  errorMessage?: string;
  errorName?: string;
  errorDetails?: string;
}

export interface RequestOptions extends RequestInit {
  url: string;
  responseType?: "json" | "text" | "raw";
  fetchPolyfill?: (url: string, options?: RequestInit) => Promise<Response>;
}
export interface DBStore {
  translatedText: string;
  from: string;
  to: string;
  detectedFrom: string;
  service: string;
  key: string;
}

export interface DBQuery {
  originalText: string;
  from: string;
  to: string;
  service: string;
}

export interface DBDelete {
}
export interface DBGetSize {
}

export interface Sentence {
  text: string;
  id: number;
  variables?: Record<string, string>;
  from: Language;
  to: Language;
  url: string;
  origin?: string;
}
export interface TempSentence {
  from: Language;
  to: Language;
  prefix: string;
  text: string;
  suffix: string;
  index: number;
  url: string;
}
export interface TempSentenceGroup {
  from: Language;
  to: Language;
  tempSentences: TempSentence[];
  url: string;
}

export interface TranslationPayload {
  text: string;
  from: Language;
  to: Language;
  url: string;
}

export interface TranslationListPayload {
  url: string;
  text: string[];
  from: Language;
  to: Language;
}
export interface TranslationResult {
  text: string;
  from: Language;
  to: Language;
}

export interface TranslationListResult {
  text: string[];
  from: Language;
  to: Language;
}
export interface MultipleTranslationPayload {
  sentences: Sentence[];
}
export interface MultipleTranslationResult {
  sentences: Sentence[];
}

export interface TranslationGeneralConfig {
}

export interface Match {
  matches?: string | string[];
  excludeMatches?: string | string[];
  selectorMatches?: string | string[];
  excludeSelectorMatches?: string | string[];
}

export interface StrictMatch extends Match {
  matches: string[];
  excludeMatches: string[];
}
export interface StrictLanguageMatch extends StrictMatch {
  matches: Language[];
  excludeMatches: Language[];
}
export interface StrictPageMatch extends StrictMatch {
  selectorMatches: string[];
  excludeSelectorMatches: string[];
}

export interface Rule {
  selectors?: string | string[];
  additionalSelectors?: string | string[];
  excludeSelectors?: string | string[];
  additionalExcludeSelectors?: string | string[];
  atomicBlockSelectors?: string | string[];
  atomicBlockTags?: string | string[];
  containerMinTextCount?: number;
  lineBreakMaxTextCount?: number;
  extraInlineSelectors?: string | string[];
  extraBlockSelectors?: string | string[];
  translationClasses?: string | string | string[];
  inlineTags?: string | string[];
  preWhitespaceDetectedTags?: string | string[];
  excludeTags?: string | string[];
  additionalExcludeTags?: string | string[];
  stayOriginalTags?: string | string[];
  stayOriginalSelectors?: string | string[];
  _comment?: string;
  globalStyles?: Record<string, string>;
  globalAttributes?: Record<string, Record<string, string>>;
  wrapperPrefix?: string;
  wrapperSuffix?: string;
  urlChangeDelay?: number;
  observeUrlChange?: boolean;
  paragraphMinTextCount?: number;
  paragraphMinWordCount?: number;
  normalizeBody?: string;
  blockMinTextCount?: number;
  blockMinWordCount?: number;
  allBlockTags?: string | string[];
  isTransformPreTagNewLine?: boolean;
  metaTags?: string | string[];
  isPdf?: boolean;
  pdfNewParagraphLineHeight?: number;
  pdfNewParagraphIndent?: number;
  pdfNewParagraphIndentRightIndentPx?: number;
  isShowUserscriptPagePopup?: boolean;
  fingerCountToToggleTranslagePageWhenTouching?: number;
}
export interface StrictRule extends Rule {
  selectors: string[];
  additionalSelectors: string[];
  excludeSelectors: string[];
  metaTags: string[];
  lineBreakMaxTextCount: number;
  containerMinTextCount: number;
  preWhitespaceDetectedTags: string[];
  stayOriginalSelectors: string[];
  additionalExcludeSelectors: string[];
  atomicBlockSelectors: string[];
  atomicBlockTags: string[];
  normalizeBody: string;
  extraInlineSelectors: string[];
  additionalInlineSelectors: string[];
  extraBlockSelectors: string[];
  translationClasses: string[];
  allBlockTags: string[];
  inlineTags: string[];
  additionalInlineTags: string[];
  excludeTags: string[];
  additionalExcludeTags: string[];
  stayOriginalTags: string[];
  additionalStayOriginalTags: string[];
  globalStyles: Record<string, string>;
  globalAttributes: Record<string, Record<string, string>>;
  wrapperPrefix: string;
  wrapperSuffix: string;
  urlChangeDelay: number;
  observeUrlChange: boolean;
  paragraphMinTextCount: number;
  paragraphMinWordCount: number;
  blockMinTextCount: number;
  blockMinWordCount: number;
  isTransformPreTagNewLine: boolean;
  isPdf: boolean;
  pdfNewParagraphLineHeight: number;
  pdfNewParagraphIndent: number;
  pdfNewParagraphIndentRightIndentPx: number;
  isShowUserscriptPagePopup: boolean;
  fingerCountToToggleTranslagePageWhenTouching: number;
}

export type KeyOfStrictRule = keyof StrictRule;
export interface PagePopupConfig {
  position: "top" | "bottom" | "left" | "right";
  right?: number;
  left?: number;
  top?: number;
  bottom?: number;
}

export type KeyOfRule = keyof Rule;
export type SpecialRule = Rule & Match;
export interface LocalConfig {
  pagePopupConfig?: PagePopupConfig;
}
export interface UserConfig {
  cache?: boolean;
  targetLanguage?: string;
  translationArea?: TranslationArea;
  translationStartMode?: TranslationStartMode;
  interfaceLanguage?: string;
  generalRule?: Rule;
  interval?: number;
  rules?: SpecialRule[];
  translationUrlPattern?: Match;
  translationLanguagePattern?: Match;
  sourceLanguageUrlPattern?: Record<string, Match>;
  translationParagraphLanguagePattern?: Match;
  immediateTranslationTextCount?: number;
  translationBodyAreaPattern?: Match;
  translationTheme?: string;
  translationThemePatterns?: Record<string, StrictMatch>;
  translationService?: string;
  translationServices?: Record<
    string,
    TranslationServiceConfig
  >;
  translationGeneralConfig?: TranslationGeneralConfig;
  debug?: boolean;
  buildinConfigUpdatedAt?: string;
  minVersion?: string;
  alpha?: boolean;
  latestVersion?: string;
  shortcuts?: Record<string, string>;
}

export interface TranslationServiceConfig extends Match {
  [key: string]: string | string[] | undefined;
}

export interface GetContextOptions {
  url: string;
  config: Config;
  state?: ContextState;
}
export interface Config extends UserConfig {
  cache: boolean;
  interfaceLanguage: Language;
  buildinConfigUpdatedAt: string;
  minVersion: string;
  donateUrl: string;
  feedbackUrl: string;
  targetLanguage: string;
  interval: number;
  shortcuts: Record<string, string>;
  immediateTranslationTextCount: number;
  generalRule: StrictRule;
  rules: SpecialRule[];
  translationUrlPattern: StrictMatch;
  translationLanguagePattern: StrictLanguageMatch;
  translationArea: TranslationArea;
  translationBodyAreaPattern: StrictPageMatch;
  translationStartMode: TranslationStartMode;
  translationParagraphLanguagePattern: StrictPageMatch;
  sourceLanguageUrlPattern: Record<string, StrictMatch>;
  translationTheme: string;
  translationThemePatterns: Record<string, StrictPageMatch>;
  translationService: string;
  translationServices: Record<
    string,
    TranslationServiceConfig
  >;
  translationGeneralConfig: TranslationGeneralConfig;
  debug: boolean;
  alpha: boolean;
  latestVersion?: string;
}
export type KeyOfConfig = keyof Config;
export type FormPropType = "text" | "select" | "password";
export interface FormField {
  type: FormPropType;
  name: string;
  required: boolean;
  label?: string;
  options?: Option[];
  default?: string;
}
export interface Option {
  value: string;
  label?: string;
}

export type TranslationServiceEngine =
  | "tencent"
  | "google"
  | "volcAlpha"
  | "deepl"
  | "baidu"
  | "volc"
  | "youdao"
  | "caiyun"
  | "openl"
  | "mock2"
  // | "bai"
  | "bing"
  | "transmart"
  | "d"
  | "mock"
  | "deeplx";

export interface TencentErrorResponse {
  Response: {
    Error: {
      Message: string;
    };
  };
}
export interface TencentResponse {
  Response: {
    TargetText: string;
    Source: string;
    Target: string;
    RequestId: string;
  };
}

export interface TencentListResponse {
  Response: {
    TargetTextList: string[];
    Source: string;
    Target: string;
    RequestId: string;
  };
}
export interface GoogleResponse {
  data: [string[], null, string];
}

export type TranslationArea = "main" | "body";
export type TranslationStartMode = "dynamic" | "immediate";
// temp variable
export interface ContextState {
  translationArea: TranslationArea;
  translationStartMode: TranslationStartMode;
  isAutoTranslate: boolean;
  isNeedClean: boolean;
}
export interface Context {
  config: Config;
  rule: StrictRule;
  targetLanguage: Language;
  translationService: TranslationServiceEngine;
  translationTheme: TranslationTheme;
  isDetectParagraphLanguage: boolean;
  sourceLanguage: Language;
  isTranslateUrl: boolean;
  isTranslateExcludeUrl: boolean;
  url: string;
  encryptedUrl: string;
  state: ContextState;
  localConfig: LocalConfig;
}
export declare const languages: readonly [
  "af",
  "am",
  "ar",
  "auto",
  "az",
  "be",
  "bg",
  "bn",
  "bs",
  "ca",
  "ceb",
  "co",
  "cs",
  "cy",
  "da",
  "de",
  "el",
  "en",
  "eo",
  "es",
  "et",
  "eu",
  "fa",
  "fi",
  "fil",
  "fj",
  "fr",
  "fy",
  "ga",
  "gd",
  "gl",
  "gu",
  "ha",
  "haw",
  "he",
  "hi",
  "hmn",
  "hr",
  "ht",
  "hu",
  "hy",
  "id",
  "ig",
  "is",
  "it",
  "ja",
  "jw",
  "ka",
  "kk",
  "km",
  "kn",
  "ko",
  "ku",
  "ky",
  "la",
  "lb",
  "lo",
  "lt",
  "lv",
  "mg",
  "mi",
  "mk",
  "ml",
  "mn",
  "mr",
  "ms",
  "mt",
  "mww",
  "my",
  "ne",
  "nl",
  "no",
  "ny",
  "otq",
  "pa",
  "pl",
  "ps",
  "pt",
  "ro",
  "ru",
  "sd",
  "si",
  "sk",
  "sl",
  "sm",
  "sn",
  "so",
  "sq",
  "sr",
  "sr-Cyrl",
  "sr-Latn",
  "tn",
  "st",
  "su",
  "sv",
  "sw",
  "ta",
  "te",
  "tg",
  "th",
  "tlh",
  "tlh-Qaak",
  "to",
  "tr",
  "ty",
  "ug",
  "uk",
  "ur",
  "uz",
  "vi",
  "wyw",
  "xh",
  "yi",
  "yo",
  "yua",
  "yue",
  "zh-CN",
  "zh-Hans",
  "zh-TW",
  "zh",
  "zu",
];

export type Language = typeof languages[number];

export interface TransmartResponse {
  header: Header;
  auto_translation: string;
  message: string;
}

export interface TransmartListResponse {
  header: Header;
  auto_translation: string[];
  message: string;
}
export interface TransmartDetectLanguageResponse {
  header: Header;
  language: string;
  message: string;
}
export interface Header {
  type: string;
  ret_code: string;
  time_cost: number;
  request_id: string;
}
