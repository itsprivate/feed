export interface Rule {
  type: string;
  key?: string;
  value: string | number | boolean;
}
export interface SourceAPIConfig {
  url: string;
  home_page_url: string;
  name: string;
}
export interface Source {
  api: SourceAPIConfig | SourceAPIConfig[];
  type: string;
  itemsPath?: string;
  rules?: Rule[];
  id: string;
  params?: Record<string, string | boolean | number>;
}

export interface SourceStatGroup {
  t: string;
  s: Record<string, Record<string, SourceStat>>;
}

export interface SourceStat {
  raw_count: number;
  filtered_count: number;
  unique_count: number;
  count: number;
  in_12: number;
  in_24: number;
  in_48: number;
  in_72: number;
  in_other: number;
}

export interface BaseSourceStat {
  count: number;
  checked_at: string;
}
export type Stat = Record<
  string,
  Record<string, Record<string, BaseSourceStat>>
>;

export interface GetFormatedItemOptions {
  imageCachedMap?: Record<string, string>;
  titleCachedMap?: Record<string, string>;
}
export interface Language {
  code: string;
  name: string;
  prefix: string;
}
export interface PageMeta {
  type: string;
  meta: Record<string, string>;
}
export interface RunOptions {
  siteIdentifiers: string[];
  config: Config;
}
export interface ItemsToFeedOptions {
  isArchive?: boolean;
  versionCode?: string;
  isPost?: boolean;
}
export interface GeneralSiteConfig {
  port?: number;
  tags?: string[];
}
export interface SiteConfig extends GeneralSiteConfig {
  max_image_height?: number;
  dev?: boolean;
  port?: number;
  hide?: boolean;
  stop?: boolean;
  deduplicate?: string;
  related?: string[];
  redirect?: boolean;
  domain?: string;
  layout?: string;
  archive?: boolean;
  translations?: Record<string, Record<string, string>>;
  standalone?: boolean;
  priority?: number;
  category?: string;
}
export interface WeekOfYear {
  year: number;
  week: number;
  number: number;
  path: string;
}
export interface ArchiveSiteConfig extends GeneralSiteConfig {
  siteIdentifier: string;
}
export interface DevOverwrite {
  translated_items_per_page: number;
  max_files_per_site: number;
}
export interface FilteredFile {
  files: string[];
  targetSiteIdentifiers: string[];
  groups: Record<string, string[]>;
}
export interface Version {
  prefix: string;
  code: string;
  name: string;
}
export interface Config {
  advice_url: string;
  translated_items_per_page: number;
  max_files_per_site: number;
  versions: Version[];
  sources: Source[];
  sites: Record<string, SiteConfig>;
  translations: Record<string, Record<string, string>>;
  dev: DevOverwrite;
  page_size: number;
  languages: Language[];
}
export interface Link {
  url: string;
  name: string;
}
export interface Author {
  url: string;
  name: string;
  avatar?: string;
}
export interface ParsedFilename {
  id: string;
  language: string;
  type: string;
  year: string;
  month: string;
  day: string;
}
export interface ParsedFilenameWithTime extends ParsedFilename {
  hour: string;
  minute: string;
  second: string;
  millisecond: string;
  order: string;
}
export interface Task {
  meta: Record<string, string>;
  type: string;
}
export interface VideoSource {
  url: string;
  type?: string;
}
export interface Video {
  sources: VideoSource[];
  poster?: string;
  width?: number;
  height?: number;
}
export interface Embed {
  html?: string;
  width?: number;
  height?: number;
  url: string;
  poster?: string;
  type: string;
  provider: string;
}
export interface FormatedItem {
  id: string;
  image?: string;
  url: string;
  _raw_url?: string;
  date_published: string;
  date_modified: string;
  tags?: string[];
  external_url?: string;
  authors?: Author[];
  _video?: Video;
  _embed?: Embed;
  _score?: number;
  _num_comments?: number;
  _sensitive?: boolean;
  _original_published: string;
  _original_language: string;
  _title_prefix?: string;
  _title_suffix?: string;
  _translations?: Record<string, Record<string, string>>;
}
type ValueOf<T> = T[keyof T];
export type ItemKey = keyof FormatedItem;
export type FeedItemKey = keyof FeedItem;
export type FeedItemValueOf = ValueOf<FeedItem>;
export type LevelName = "debug" | "info" | "warn" | "error" | "fatal";

export enum Level {
  Debug = 0,
  Info = 1,
  Warn = 2,
  Error = 3,
  Fatal = 4,
}

export interface TranslationOptions {
  isMock?: boolean;
  countPerPage?: number;
}
export interface Feedjson {
  version: string;
  title: string;
  description: string;
  icon: string;
  favicon: string;
  language: string;
  home_page_url: string;
  feed_url: string;
  _latest_build_time: string;
  _apple_touch_icon: string;
  items: FeedItem[];
  _site_version: string;
  _tags?: string[];
  _site_tags?: string[];
  _archive?: string[];
  _issues?: string[];
  _sources: Link[];
}
export interface ItemsJson {
  meta?: Record<string, string>;
  items: Record<string, FormatedItem>;
  tags?: string[];
  archive?: string[];
  issues?: string[];
}

export interface FeedItem extends FormatedItem {
  title: string;
  author?: Author;
  summary: string;
  content_text: string;
  content_html: string;
  _lite_content_html?: string;
  _links?: Link[];
  _tag_links?: Link[];
}
export interface Type<T> extends Function {
  new (...args: unknown[]): T;
}

export interface GetFeedItemSyncOptions {
  versionCode?: string;
}

export interface UrlInfo {
  language: Language;
  version: Version;
  pathname: string;
  url: string;
}
export interface LinkOptions {
  isUseHTML?: boolean;
}
export interface ParsedArchiveUrl {
  siteIdentifier: string;
  itemsFilePath: string;
  language: Language;
  version: Version;
  pathname: string;
  pagePathname: string;
  pageType: string;
  scope: string;
  meta: Record<string, string>;
}
