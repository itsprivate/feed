export interface Rule {
  type: string;
  key: string;
  value: string;
}
export interface Source {
  url: string;
  type: string;
  itemsPath?: string;
  rules?: Rule[];
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
  port: number;
  tags: string[];
}
export interface SiteConfig extends GeneralSiteConfig {
  indexed?: boolean;
  port: number;
  sources: Source[];
  translations: Record<string, Record<string, string>>;
}
export interface ArchiveSiteConfig extends GeneralSiteConfig {
  siteIdentifier: string;
}

export interface Config {
  sites: Record<string, SiteConfig>;
  translations: Record<string, Record<string, string>>;
  archive: ArchiveSiteConfig;
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
  year: string;
  month: string;
  day: string;
  language: string;
  type: string;
  targetSite: string;
  targetSiteIdentifier: string;
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
  authors?: Author[];
  _score?: number;
  _video?: Video;
  _sensitive?: boolean;
  _original_published: string;
  _original_language: string;
  _title_prefix?: string;
  _links?: Link[];
  _translations?: Record<string, Record<string, string>>;
  [key: string]: unknown;
}
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
  _tags: string[];
}
export interface ItemsJson {
  meta?: Record<string, string>;
  items: Record<string, FormatedItem>;
}

export interface FeedItem extends FormatedItem {
  title: string;
  summary: string;
  content_text: string;
  content_html: string;
}
export interface Type<T> extends Function {
  new (...args: unknown[]): T;
}
