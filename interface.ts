export interface Source {
  url: string;
  type: string;
  itemsPath?: string;
}
export interface RunOptions {
  domains: string[];
}

export interface SiteConfig {
  sources: Source[];
  tags: string[];
  translations: Record<string, Record<string, string>>;
}
export interface Config {
  sites: Record<string, SiteConfig>;
  translations: Record<string, Record<string, string>>;
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
}
export interface FormatedItem {
  id: string;
  image?: string;
  url: string;
  date_published: string;
  date_modified: string;
  tags: string[];
  authors: Author[];
  _original_language: string;
  _links: Link[];
  _translations: Record<string, Record<string, string>>;
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
  mock?: boolean;
  countPerPage?: number;
}
