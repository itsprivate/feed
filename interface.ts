export interface Rule {
  type: string;
  key?: string;
  value: string | number | boolean;
}
export interface Source {
  url: string | string[];
  type: string;
  itemsPath?: string;
  rules?: Rule[];
  id: string;
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
}
export interface GeneralSiteConfig {
  port?: number;
  tags?: string[];
}
export interface SiteConfig extends GeneralSiteConfig {
  dev?: boolean;
  port?: number;
  redirect?: boolean;
  domain?: string;
  archive?: boolean;
  translations?: Record<string, Record<string, string>>;
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
export interface Config {
  icon: string;
  favicon: string;
  root_domain: string;
  translated_items_per_page: number;
  max_files_per_site: number;
  sources: Source[];
  sites: Record<string, SiteConfig>;
  translations: Record<string, Record<string, string>>;
  archive: ArchiveSiteConfig;
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
export interface FormatedItem {
  id: string;
  image?: string;
  url: string;
  date_published: string;
  date_modified: string;
  tags?: string[];
  external_url?: string;
  authors?: Author[];
  _video?: Video;
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
  items: FeedItem[];
  _tags?: string[];
  _site_tags?: string[];
  _archive?: string[];
  _issues?: string[];
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
  _title_type?: string;
}
export interface Type<T> extends Function {
  new (...args: unknown[]): T;
}
