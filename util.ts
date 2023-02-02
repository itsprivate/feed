import {
  camelCase,
  DateTimeFormatter,
  DigestClient,
  fs,
  kebabCase,
  mustache,
  path,
  posixPath,
  S3Bucket,
  slug as slugFn,
  YAML,
} from "./deps.ts";
import { NotFound } from "./error.ts";
import { DEV_MODE_HANDLED_ITEMS, ROOT_DOMAIN } from "./constant.ts";
import log from "./log.ts";
import {
  Config,
  FilteredFile,
  Language,
  Link,
  PageMeta,
  ParsedArchiveUrl,
  ParsedFilename,
  ParsedFilenameWithTime,
  Rule,
  SiteConfig,
  Source,
  SourceAPIConfig,
  UrlInfo,
  Version,
  WeekOfYear,
} from "./interface.ts";
export const SECOND = 1e3;
export const MINUTE = SECOND * 60;
export const HOUR = MINUTE * 60;
export const DAY = HOUR * 24;
export const WEEK = DAY * 7;
const DAYS_PER_WEEK = 7;
enum Day {
  Sun,
  Mon,
  Tue,
  Wed,
  Thu,
  Fri,
  Sat,
}
export async function request(
  url: string,
  init: RequestInit = {},
) {
  const c = new AbortController();
  const id = setTimeout(() => c.abort(), 30000);
  const headers = new Headers(init.headers);
  headers.set(
    "User-Agent",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36",
  );
  const params = {
    ...init,
    signal: c.signal,
    headers,
  };
  const r = await fetch(url, params);
  clearTimeout(id);
  if (!r.ok) {
    throw new Error(`Request failed: ${url}`);
  }
  return r;
}

export const get = (obj: unknown, path: string, defaultValue = undefined) => {
  const travel = (regexp: RegExp) =>
    String.prototype.split
      .call(path, regexp)
      .filter(Boolean)
      .reduce(
        (res, key) =>
          res !== null && res !== undefined
            ? (res as Record<string, string>)[key]
            : res,
        obj,
      );
  const result = travel(/[,[\]]+?/) || travel(/[,[\].]+?/);
  return result === undefined || result === obj ? defaultValue : result;
};
export const isDev = () => {
  return Deno.env.get("PROD") !== "1";
};
export const isMock = () => {
  if (isDev()) {
    return (Deno.env.get("MOCK") !== "0");
  } else {
    return false;
  }
};

export const isDebug = () => {
  return Deno.env.get("DEBUG") === "1";
};
export const getDataPath = () => {
  const dataPath = isDev() ? "current" : "prod-current";
  return dataPath;
};
export const getRecentlySiteStatPath = () => {
  const recentlySitesPath = path.join(
    getDataPath(),
    "recently-sites.json",
  );
  return recentlySitesPath;
};
export const getRecentlySourcesStatPath = () => {
  const recentlySitesPath = path.join(
    getDataPath(),
    "recently-sources.json",
  );
  return recentlySitesPath;
};
export const getFeedSiteIdentifiers = (config: Config) => {
  const sitesMap = config.sites;
  const keys = Object.keys(sitesMap);
  const siteIdentifiers = keys.filter((key) => {
    const site = sitesMap[key];

    return !(site.dev) && !(site.standalone);
  });
  return siteIdentifiers;
};
export const getArchivePath = () => {
  const dataPath = isDev() ? "archive" : "prod-archive";
  return dataPath;
};
export const getProdArchivePath = () => {
  return "prod-archive";
};
export const getDistPath = () => {
  const dataPath = isDev() ? "public" : "prod-public";
  return dataPath;
};
// this directory is used to store processing files
// like formated, translated, etc.
// most time this will not be store files
// only when failed at some step, we will store the processed files here
export const getCachePath = () => {
  const dataPath = isDev() ? "cache" : "prod-cache";
  return dataPath;
};

// this directory will not be load when build
export const getTempPath = () => {
  const dataPath = isDev() ? "temp" : "prod-temp";
  return dataPath;
};
export const getChangedSitePaths = () => {
  return path.join(getTempPath(), "changed-sites.json");
};
export const getSiteIdentifierDistPath = (siteIdentifier: string) => {
  return `${getDistPath()}/${siteIdentifierToPath(siteIdentifier)}`;
};
export const getDistFilePath = (siteIdentifier: string, file: string) => {
  return path.join(getDistPath(), siteIdentifierToPath(siteIdentifier), file);
};
export const getDataRawPath = () => {
  return `${getCachePath()}/1-raw`;
};
export const tryGetSiteByFolderPath = (folderPath: string): string | null => {
  const basename = path.basename(folderPath);
  if (basename.startsWith("site_")) {
    return basename.substring(5);
  } else {
    return null;
  }
};
export const getDataFormatedPath = () => {
  return `${getCachePath()}/2-formated`;
};

export const getDataTranslatedPath = () => {
  return `${getCachePath()}/3-translated`;
};

export const getDataCurrentItemsPath = () => {
  return `${getDataPath()}/items`;
};
export const getDataStatsDirPath = () => {
  return path.join(getDataPath(), "stats");
};
export const getDataStatsPath = (year: number) => {
  return path.join(getDataStatsDirPath(), `${year}.json`);
};
export const getDevDataCurrentItemsPath = () => {
  return `current/items`;
};

export const getMigratedIssueMapPath = () => {
  if (isDev()) {
    return `./migrations/issue-map.json`;
  } else {
    return `./migrations/prod-issue-map.json`;
  }
};
export const getCurrentItemsFilePath = (siteIdentifier: string) => {
  return `${getDataCurrentItemsPath()}/${
    siteIdentifierToPath(siteIdentifier)
  }/items.json`;
};

export const getCurrentKeysFilePath = (siteIdentifier: string) => {
  return `${getDataCurrentItemsPath()}/${
    siteIdentifierToPath(siteIdentifier)
  }/keys.json`;
};
export const getCurrentToBeArchivedItemsFilePath = (siteIdentifier: string) => {
  return `${getDataCurrentItemsPath()}/${
    siteIdentifierToPath(siteIdentifier)
  }/to-be-archived-items.json`;
};

export const readJSONFile = async (path: string) => {
  const file = await Deno.readTextFile(path);
  return JSON.parse(file);
};

export const writeTextFile = async (filePath: string, text: string) => {
  // ensure dir exists
  const dir = path.dirname(filePath);
  await fs.ensureDir(dir);
  await Deno.writeTextFile(filePath, text);
};

export const writeJSONFile = async (filePath: string, data: unknown) => {
  const file = JSON.stringify(data, null, 2);
  // ensure dir exists
  const dir = path.dirname(filePath);
  await fs.ensureDir(dir);
  await Deno.writeTextFile(filePath, file + "\n");
};
export const getFullYear = (date: Date): string => {
  return date.getUTCFullYear().toString();
};
export const getFullMonth = (date: Date): string => {
  const month = date.getUTCMonth() + 1;
  return month < 10 ? `0${month}` : month.toString();
};

export const getFullDay = (date: Date): string => {
  const day = date.getUTCDate();
  return day < 10 ? `0${day}` : day.toString();
};

export const getConfig = async function (): Promise<Config> {
  const config = YAML.parse(
    await Deno.readTextFile("config.yml"),
  ) as Config;
  return config;
};
export const getGenConfig = async function (): Promise<Config> {
  const config = await readJSONFile("./config.gen.json") as Config;
  return config;
};
export const formatIsoDate = (date: Date): string => {
  const beijingDate = new Date(date.getTime() + 8 * 60 * 60 * 1000);

  return beijingDate.toISOString().replace("Z", "+08:00");
};
export const formatBeijing = (date: Date, formatString: string) => {
  date = new Date(date.getTime() + 8 * 60 * 60 * 1000);
  const formatter = new DateTimeFormatter(formatString);
  return formatter.format(date, {
    timeZone: "UTC",
  });
};
export const getBeijingDay = (date: Date): string => {
  date = new Date(date.getTime() + 8 * 60 * 60 * 1000);
  const formatter = new DateTimeFormatter("MM-dd");
  return formatter.format(date, {
    timeZone: "UTC",
  });
};
export const formatHumanTime = (date: Date) => {
  const now = new Date();
  const nowDate = formatBeijing(now, "yyyy-MM-dd");
  const dateDate = formatBeijing(date, "yyyy-MM-dd");
  const isToday = nowDate === dateDate;

  const nowYear = formatBeijing(now, "yyyy");
  const dateYear = formatBeijing(date, "yyyy");
  const isThisYear = nowYear === dateYear;

  if (isToday) {
    return formatBeijing(date, "HH:mm");
  } else if (isThisYear) {
    return formatBeijing(date, "MM-dd");
  } else {
    return formatBeijing(date, "yy-MM-dd");
  }
};

export const getArchivedFilePath = function (
  siteIdentifier: string,
  relativePath: string,
): string {
  let filePath = getArchivePath() + "/" +
    siteIdentifierToPath(siteIdentifier);
  // remove relative path slashes
  if (relativePath.startsWith("/")) {
    relativePath = relativePath.substring(1);
  }
  filePath += "/" + relativePath;
  return filePath;
};

export const siteIdentifierToPath = (siteIdentifier: string) => {
  // return siteIdentifier.replace(/\./g, "_");
  //
  return siteIdentifier;
};
export const siteIdentifierToDomain = (
  siteIdentifier: string,
  site?: SiteConfig,
) => {
  if (site && site.domain) {
    return site.domain;
  }
  if (siteIdentifier.includes(".")) {
    return siteIdentifier;
  }
  return `${siteIdentifier}.${ROOT_DOMAIN}`;
};
export const urlToSiteIdentifier = (url: string, config: Config) => {
  const urlObj = new URL(url);

  if (urlObj.hostname === "localhost") {
    for (const siteDdentifier in config.sites) {
      const siteConfig = config.sites[siteDdentifier];
      if (Number(siteConfig.port) === Number(urlObj.port)) {
        return siteDdentifier;
      }
    }
    throw new Error("Cannot find siteIdentifier for " + url);
  } else {
    let hostname = urlObj.hostname;
    if (urlObj.hostname.startsWith("dev-")) {
      hostname = hostname.substring(4);
    }
    return hostname.replace(`.${ROOT_DOMAIN}`, "");
  }
};
export const siteIdentifierToUrl = (
  siteIdentifier: string,
  pathname: string,
  config: Config,
): string => {
  let port: number;

  const siteConfig = config.sites[siteIdentifier];
  port = siteConfig.port || 8000;

  // pathname add start slash
  if (!pathname.startsWith("/")) {
    pathname = "/" + pathname;
  }
  const isWorkersDev = Deno.env.get("WORKERS_DEV") === "1";
  if (isWorkersDev) {
    return `https://dev-${
      siteIdentifierToDomain(siteIdentifier, config.sites[siteIdentifier])
    }${pathname}`;
  } else if (isDev()) {
    return `http://localhost:${port}${pathname}`;
  } else {
    return `https://${
      siteIdentifierToDomain(siteIdentifier, config.sites[siteIdentifier])
    }${pathname}`;
  }
};
export const feedjsonUrlToRssUrl = (url: string) => {
  return url.replace("/feed.json", "/feed.xml");
};
export const urlToLanguageUrl = (
  url: string,
  languagePrefix: string,
  versions: Version[],
  languages: Language[],
) => {
  const urlInfo = parsePageUrl(url, versions, languages);
  const urlObj = new URL(url);
  // check if url has a prefix
  urlObj.pathname = `/${languagePrefix}${urlInfo.version.prefix}${
    urlInfo.pathname.slice(1)
  }`;
  return urlObj.toString();
};

export const urlToVersionUrl = (
  url: string,
  versionPrefix: string,
  versions: Version[],
  languages: Language[],
) => {
  const urlInfo = parsePageUrl(url, versions, languages);
  const urlObj = new URL(url);
  // check if url has a prefix
  urlObj.pathname = `/${urlInfo.language.prefix}${versionPrefix}${
    urlInfo.pathname.slice(1)
  }`;
  return urlObj.toString();
};
export const parsePageUrl = (
  url: string,
  versions: Version[],
  lanuguages: Language[],
): UrlInfo => {
  const urlObj = new URL(url);
  // get language code
  const langField = urlObj.pathname.split("/")[1];
  // check if language code is valid
  let language = lanuguages[0];
  let pathname = urlObj.pathname;
  for (const targetLang of lanuguages) {
    let prefix = targetLang.prefix;
    // remove trailing slash
    if (prefix.endsWith("/")) {
      prefix = prefix.slice(0, -1);
    }
    if (prefix === langField) {
      language = targetLang;
      pathname = urlObj.pathname.slice(targetLang.prefix.length);
      break;
    }
  }

  const versionField = pathname.split("/")[1];
  // check if language code is valid
  let version = versions[0];
  for (const targetVersion of versions) {
    let prefix = targetVersion.prefix;
    // remove trailing slash
    if (prefix.endsWith("/")) {
      prefix = prefix.slice(0, -1);
    }
    if (prefix === versionField) {
      version = targetVersion;
      pathname = pathname.slice(targetVersion.prefix.length);
      break;
    }
  }
  urlObj.pathname = pathname;
  const newUrl = urlObj.toString();

  return {
    language,
    version,
    pathname,
    url: newUrl,
  };
};

export const pathToSiteIdentifier = (path: string) => {
  return path;
};
export const arrayToObj = <T>(
  arr: T[],
  key = "id",
): Record<string, T> => {
  const obj: Record<string, T> = {};
  for (const item of arr) {
    obj[(item as unknown as Record<string, string>)[key]] = item;
  }
  return obj;
};
export const getItemTranslations = function (
  translations: Record<string, Record<string, string>>,
  languageCode: string,
  originalLanguageCode: string,
): Record<string, string> {
  return translations[languageCode] || translations[originalLanguageCode] || {};
};

// item.json -> /
// tags/show-hn/item.json -> /tags/show-hn/
export const itemsPathToURLPath = function (itemsPath: string) {
  const removedPath = itemsPath.replace(/items\.json$/, "");
  if (!removedPath.endsWith("/")) {
    return removedPath + "/";
  }
  if (!removedPath.startsWith("/")) {
    return "/" + removedPath;
  }
  return removedPath;
};

export const getPageMeta = (itemsRelativePath: string): PageMeta => {
  const pathArr = itemsRelativePath.split("/");
  let pageType = "index";
  let meta: Record<string, string> = {};
  if (pathArr.length >= 2) {
    const rootField = pathArr[2];
    if (rootField === "tags") {
      pageType = "tag";
      meta = {
        tagIdentifier: pathArr[2],
      };
    } else if (rootField === "archive") {
      pageType = "archive";
      meta = {
        year: pathArr[3],
        week: pathArr[4],
      };
    } else if (rootField === "issues") {
      pageType = "issues";
      meta = {
        year: pathArr[3],
        week: pathArr[4],
      };
    } else if (rootField === "posts") {
      pageType = "posts";
      meta = {
        year: pathArr[3],
        week: pathArr[4],
        id: pathArr[5],
      };
    }
  }
  return {
    type: pageType,
    meta: meta,
  };
};

export const urlToFilePath = (url: string): string => {
  const urlObj = new URL(url);
  const pathname = urlObj.pathname;

  let filepath = pathname;

  if (pathname === "/") {
    filepath = "index.html";
  } else {
    filepath = pathname.slice(1);
  }
  if (filepath.endsWith("/")) {
    filepath += "index.html";
  } else {
    // check is has extension
    const basename = path.basename(filepath);
    if (!basename.includes(".")) {
      if (filepath.endsWith("/")) {
        filepath += "index.html";
      } else {
        filepath += "/index.html";
      }
    }
  }

  return filepath;
};
export const getArchiveS3Bucket = (bucket: string): S3Bucket => {
  const params = {
    accessKeyID: Deno.env.get("AWS_ACCESS_KEY_ID")!,
    secretKey: Deno.env.get("AWS_SECRET_ACCESS_KEY")!,
    bucket: bucket,
    region: Deno.env.get("AWS_DEFAULT_REGION")!,
    endpointURL: Deno.env.get("AWS_ENDPOINT")!,
  };
  const s3Bucket = new S3Bucket(
    params,
  );
  return s3Bucket;
};
export const getCurrentDataS3Bucket = (
  bucket: string,
): S3Bucket => {
  const s3Bucket = new S3Bucket(
    {
      accessKeyID: Deno.env.get("AWS_ACCESS_KEY_ID")!,
      secretKey: Deno.env.get("AWS_SECRET_ACCESS_KEY")!,
      bucket: bucket,
      region: Deno.env.get("AWS_DEFAULT_REGION")!,
      endpointURL: Deno.env.get("AWS_ENDPOINT")!,
    },
  );
  return s3Bucket;
};

export const loadS3ArchiveFile = async (fileRelativePath: string) => {
  const AWS_BUCKET = getArchivedBucketName();
  const s3Bucket = getArchiveS3Bucket(AWS_BUCKET);
  const object = await s3Bucket.headObject(fileRelativePath);
  if (object && object.etag) {
    const getObject = await s3Bucket.getObject(fileRelativePath);
    if (getObject) {
      const { body } = getObject;
      const data = await new Response(body).text();
      await writeTextFile(fileRelativePath, data);
    } else {
      throw new Error(`loadS3ArchiveFile: getObject is null`);
    }
  }
};

export function getCurrentBucketName() {
  return "feed";
}
export function getArchivedBucketName() {
  return "feed";
}
export function getArchiveSitePrefix(config: Config) {
  if (isDev()) {
    return `http://localhost:${config.sites.i.port}`;
  } else {
    return `https://i.${ROOT_DOMAIN}`;
  }
}
export const getCurrentTranslations = function (
  siteIdentifier: string,
  languageCode: string,
  config: Config,
): Record<string, string> {
  let currentTranslations: Record<string, string> = {};
  const sitesMap = config.sites;
  const siteConfig = sitesMap[siteIdentifier];

  // merge site translations
  const generalTranslations = getGeneralTranslations(languageCode, config);
  let siteTranslations = {};
  if (siteConfig.translations) {
    siteTranslations = siteConfig.translations[languageCode] ??
      siteConfig.translations["zh-Hans"] ?? {};
  }

  currentTranslations = {
    ...generalTranslations,
    ...siteTranslations,
  };

  return currentTranslations;
};
export const getGeneralTranslations = function (
  languageCode: string,
  config: Config,
) {
  let currentTranslations: Record<string, string> = {};
  const translations = config.translations;

  // merge site translations
  const generalTranslations = translations[languageCode] ?? {};

  const defaultTranslations = translations["zh-Hans"] ?? {};

  currentTranslations = {
    ...defaultTranslations,
    ...generalTranslations,
  };

  return currentTranslations;
};
export function resortSites(
  siteIdentifier: string,
  siteIdentifiers: string[],
  config: Config,
) {
  const relatedSites = config.sites[siteIdentifier].related ?? [];

  // by priority
  // lower is more priority
  const sitesMap = config.sites;
  const sortedSites = siteIdentifiers.sort((a, b) => {
    if (relatedSites.includes(a) && relatedSites.includes(b)) {
      const aPriority = sitesMap[a].priority ?? 50;
      const bPriority = sitesMap[b].priority ?? 50;
      return aPriority - bPriority;
    } else if (relatedSites.includes(a)) {
      return -1;
    } else if (relatedSites.includes(b)) {
      return 1;
    } else {
      const aPriority = sitesMap[a].priority ?? 50;
      const bPriority = sitesMap[b].priority ?? 50;
      return aPriority - bPriority;
    }
  });
  return sortedSites;
}
export const resortArchiveKeys = function (currentArchive: string[]): string[] {
  // write currentArchive file
  // resort currentArchive by time
  currentArchive = currentArchive.sort((a, b) => {
    const splited = a.split("/");
    const aYear = splited[0];
    const aWeek = addZero(Number(splited[1]));
    const aNum = Number("" + aYear + aWeek);

    const splited2 = b.split("/");
    const bYear = splited2[0];
    const bWeek = addZero(Number(splited2[1]));
    const bNum = Number("" + bYear + bWeek);

    return bNum - aNum;
  });
  return currentArchive;
};
export const addZero = function (num: number): string {
  if (num < 10) {
    return "0" + num;
  } else {
    return "" + num;
  }
};

export function weekOfYear(date: Date): WeekOfYear {
  const workingDate = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );

  const day = workingDate.getUTCDay();

  const nearestThursday = workingDate.getUTCDate() +
    Day.Thu -
    (day === Day.Sun ? DAYS_PER_WEEK : day);

  workingDate.setUTCDate(nearestThursday);

  // Get first day of year
  const yearStart = new Date(Date.UTC(workingDate.getUTCFullYear(), 0, 1));
  const weekYear = workingDate.getUTCFullYear();
  // return the calculated full weeks to nearest Thursday
  const week = Math.ceil(
    (workingDate.getTime() - yearStart.getTime() + DAY) / WEEK,
  );
  return {
    year: weekYear,
    week: week,
    path: `${workingDate.getUTCFullYear()}/${week}`,
    number: Number(`${weekYear}${addZero(week)}`),
  };
}
export const isWeekBiggerThan = function (aDate: Date, bDate: Date): boolean {
  const weekOfA = weekOfYear(aDate);
  const weekOfB = weekOfYear(bDate);
  if (weekOfA.number > weekOfB.number) {
    return true;
  }
  return false;
};

export const slug = function (tag: string): string {
  // @ts-ignore: npm module
  return slugFn(kebabCase(tag));
};

export const tagToPascalCase = function (tag: string): string {
  // @ts-ignore: npm module
  const slugStr = slug(tag);
  const splited = slugStr.split("-");

  if (splited.length > 1) {
    // @ts-ignore: npm module
    const camel = camelCase(slugStr);
    if (camel) {
      // upper first letter
      return camel.charAt(0).toUpperCase() + camel.slice(1);
    } else {
      return "";
    }
  } else {
    return slugStr;
  }
};

export async function sha1(message: string) {
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  const hash = await crypto.subtle.digest("SHA-1", data);
  const hashArray = Array.from(new Uint8Array(hash)); // convert buffer to byte array
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join(
    "",
  ); // convert bytes to hex string
  return hashHex;
}
export function callWithTimeout<T>(func: unknown, timeout: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("timeout")), timeout);
    // @ts-ignore: hard to type
    func().then(
      // @ts-ignore: hard to type
      (response) => resolve(response),
      // @ts-ignore: hard to type
      (err) => reject(new Error(err)),
    ).finally(() => clearTimeout(timer));
  });
}
export function tagToUrl(
  tag: string,
  siteIdentifier: string,
  language: Language,
  version: Version,
  config: Config,
): string {
  return `${
    getArchiveSitePrefix(config)
  }/${language.prefix}${version.prefix}${siteIdentifier}/tags/${
    // @ts-ignore: npm module
    slug(tag)}/`;
}
export function archiveToUrl(
  archiveKey: string,
  siteIdentifier: string,
  language: Language,
  version: Version,
  config: Config,
): string {
  return `${
    getArchiveSitePrefix(config)
  }/${language.prefix}${version.prefix}${siteIdentifier}/archive/${archiveKey}/`;
}

export function issueToUrl(
  issue: string,
  siteIdentifier: string,
  language: Language,
  version: Version,
  config: Config,
): string {
  return `${
    getArchiveSitePrefix(config)
  }/${language.prefix}${version.prefix}${siteIdentifier}/issues/${issue}/`;
}
export function postToUrl(
  id: string,
  siteIdentifier: string,
  language: Language,
  version: Version,
  config: Config,
): string {
  const parsed = parseItemIdentifier(id);
  const utcDate = new Date(
    Date.UTC(Number(parsed.year), Number(parsed.month) - 1, Number(parsed.day)),
  );
  const week = weekOfYear(utcDate);
  return `${
    getArchiveSitePrefix(config)
  }/${language.prefix}${version.prefix}${siteIdentifier}/posts/${week.path}/${id}/`;
}

export const formatNumber = (num: number): string => {
  const formatter = Intl.NumberFormat("en", { notation: "compact" });
  return formatter.format(num);
};

export const uploadFileToDufs = async (
  client: DigestClient,
  filepath: string,
) => {
  // use fetch to put file
  // const formData = new FormData();
  // formData.append("file", new Blob([]));
  const url = Deno.env.get("DUFS_URL")!;
  if (!url) {
    throw new Error("DUFS_URL is not set");
  }

  const response = await client.fetch(
    url + "/" + filepath,
    {
      method: "PUT",
      body: await Deno.readTextFile(filepath),
    },
  );
  if (response.status === 201) {
    return response;
  } else {
    throw new Error("upload failed " + filepath + " " + response.status);
  }
};

export const getDufsClient = (): DigestClient => {
  const secrets = Deno.env.get("DUFS_SECRETS");
  const secretsArr = secrets?.split(":");
  const username = secretsArr?.[0];
  const password = secretsArr?.[1];
  if (!username || !password) {
    throw new Error("DUFS_SECRETS is not set");
  }
  const client = new DigestClient(username!, password!);
  return client;
};

export function getTargetSiteIdentifiersByFilePath(filePath: string): string[] {
  const targetSiteIdentifiers = path.basename(path.dirname(filePath)).split(
    "_",
  );
  return targetSiteIdentifiers;
}

export async function getFilesByTargetSiteIdentifiers(
  dirPath: string,
  targetSiteIdentifiers: string[],
): Promise<FilteredFile> {
  const sites = targetSiteIdentifiers || [];
  const groups: Record<string, string[]> = {};
  let files: string[] = [];
  const siteTotalFiles: Record<string, number> = {};
  const filteredSites: string[] = [];
  for await (const entry of fs.walk(dirPath)) {
    if (entry.isFile && entry.name.endsWith(".json")) {
      // get siteIdentifiers
      const dirname = path.dirname(entry.path);
      const siteIdentifiers = path.basename(dirname).split("_");
      for (const siteIdentifier of siteIdentifiers) {
        if (sites.includes(siteIdentifier)) {
          if (siteTotalFiles[siteIdentifier] === undefined) {
            siteTotalFiles[siteIdentifier] = 0;
          }

          if (isDev()) {
            if (siteTotalFiles[siteIdentifier] >= DEV_MODE_HANDLED_ITEMS) {
              // log.info(`dev mode, only take ${DEV_MODE_HANDLED_ITEMS} files`);
              break;
            }
          }
          siteTotalFiles[siteIdentifier]++;
          if (!filteredSites.includes(siteIdentifier)) {
            filteredSites.push(siteIdentifier);
          }
          if (!groups[siteIdentifier]) {
            groups[siteIdentifier] = [];
          }
          groups[siteIdentifier].push(entry.path);
          files.push(entry.path);
        }
      }
    }
  }
  // files need to unique
  files = Array.from(new Set(files));
  return {
    files: files,
    targetSiteIdentifiers: filteredSites,
    groups,
  };
}

export function parseItemIdentifier(
  fileBasename: string,
): ParsedFilename {
  // remove extension
  let filename = fileBasename;
  if (filename.endsWith(".json")) {
    filename = filename.slice(0, -5);
  }
  const parts = filename.split("__");
  // first will be safe part, other will be the id parts
  const safePart = parts[0];
  const symParts = safePart.split("_");
  const language = symParts[0];
  const type = symParts[1];
  const year = symParts[2];
  const month = symParts[3];
  const day = symParts[4];
  const idParts = parts.slice(1);
  const id = idParts.join("__");
  return {
    id,
    language,
    type,
    year,
    month,
    day,
  };
}

export function parseItemIdentifierWithTime(
  fileBasename: string,
): ParsedFilenameWithTime {
  // remove extension
  let filename = fileBasename;
  if (filename.endsWith(".json")) {
    filename = filename.slice(0, -5);
  }
  const parts = filename.split("__");
  // first will be safe part, other will be the id parts
  const safePart = parts[0];
  const symParts = safePart.split("_");
  const language = symParts[0];
  const type = symParts[1];
  const year = symParts[2];
  const month = symParts[3];
  const day = symParts[4];
  const hour = symParts[5];
  const minute = symParts[6];
  const second = symParts[7];
  const millisecond = symParts[8];
  const order = symParts[9];
  const idParts = parts.slice(1);
  const id = idParts.join("__");
  return {
    id,
    language,
    type,
    year,
    month,
    day,
    hour,
    minute,
    second,
    millisecond,
    order,
  };
}
export function identifierToCachedKey(identifier: string): string {
  // to unique key, remove published date.
  const parsed = parseItemIdentifier(identifier);
  return `${parsed.language}_${parsed.type}__${parsed.id}`;
}
export async function getRedirectedUrlDirectly(url: string): Promise<string> {
  const c = new AbortController();
  const id = setTimeout(() => c.abort(), 30000);
  const headers = new Headers();
  headers.set(
    "User-Agent",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36",
  );
  const params: RequestInit = {
    signal: c.signal,
    headers,
    method: "HEAD",
    redirect: "manual",
  };
  const r = await fetch(url, params);
  clearTimeout(id);
  if (r.headers.get("location")) {
    return r.headers.get("location")!;
  }
  return url;
}

export async function getRedirectedUrl(url: string): Promise<string> {
  const fetchResult = await request(url, {
    method: "HEAD",
  });
  log.debug(
    `redirected url fetch result: `,
    url,
    fetchResult.status,
    fetchResult.url,
  );
  return fetchResult.url;
}

export function tryToRemoveUnnecessaryParams(
  url: string,
): string {
  const urlObj = new URL(url);
  urlObj.searchParams.delete("ref");
  // utm_source
  urlObj.searchParams.delete("utm_source");
  // utm_medium
  urlObj.searchParams.delete("utm_medium");
  // utm_campaign
  urlObj.searchParams.delete("utm_campaign");
  // utm_term
  urlObj.searchParams.delete("utm_term");
  // utm_content
  urlObj.searchParams.delete("utm_content");
  // utm_cid
  urlObj.searchParams.delete("utm_cid");
  // cmpid
  urlObj.searchParams.delete("cmpid");
  // srnd
  urlObj.searchParams.delete("srnd");
  // sref
  urlObj.searchParams.delete("sref");
  // taid
  urlObj.searchParams.delete("taid");

  // if www.bloomberg.com, remove all search params
  if (
    urlObj.hostname === "www.bloomberg.com" ||
    urlObj.hostname === "www.businessinsider.com" ||
    urlObj.hostname === "www.reuters.com"
  ) {
    urlObj.search = "";
  }

  return urlObj.href;
}
export const exists = async (filename: string): Promise<boolean> => {
  try {
    await Deno.stat(filename);
    // successful, file or directory must exist
    return true;
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      // file or directory does not exist
      return false;
    } else {
      // unexpected error, maybe permissions, pass it along
      throw error;
    }
  }
};

export function archiveToTitle(issuePath: string, label: string): string {
  const splited = issuePath.split("/");
  const year = splited[0];
  const week = splited[1];
  // @ts-ignore: npm module
  return mustache.render(label, {
    year,
    week,
    range: weekToRange(issuePath),
  });
}
export function startDateOfWeek(date: Date, start_day = 1): Date {
  // Returns the start of the week containing a 'date'. Monday 00:00 UTC is
  // considered to be the boundary between adjacent weeks, unless 'start_day' is
  // specified. A Date object is returned.

  date = new Date(date.getTime());
  const day_of_month = date.getUTCDate();
  const day_of_week = date.getUTCDay();
  const difference_in_days = day_of_week >= start_day
    ? day_of_week - start_day
    : day_of_week - start_day + 7;
  date.setUTCDate(day_of_month - difference_in_days);
  date.setUTCHours(0);
  date.setUTCMinutes(0);
  date.setUTCSeconds(0);
  date.setUTCMilliseconds(0);
  return date;
}
export function weekToRange(weekID: string): string {
  const splited = weekID.split("/");
  const year = Number(splited[0]);
  const week = Number(splited[1]);
  // Get first day of year
  const yearStart = new Date(Date.UTC(year, 0, 1));

  // year start monday date

  const yearStartMondayDate = startDateOfWeek(yearStart);

  const yearStartMondayFullYear = yearStartMondayDate.getUTCFullYear();

  let yearFirstWeekMonday = yearStartMondayDate;
  if (yearStartMondayFullYear !== year) {
    // then year first week monday is next +7
    yearFirstWeekMonday = new Date(yearStartMondayDate.getTime() + WEEK);
  }

  const weekMonday = yearFirstWeekMonday.getTime() + WEEK * (week - 1);
  const weekSunday = weekMonday + WEEK - 1;

  const start = formatBeijing(new Date(weekMonday), "MM.dd");
  const end = formatBeijing(new Date(weekSunday), "MM.dd");
  return `${start} - ${end}`;
}
export function parseArchiveUrl(
  url: string,
  versions: Version[],
  languages: Language[],
): ParsedArchiveUrl {
  const routeInfo = parsePageUrl(
    url,
    versions,
    languages,
  );
  const pattern = new URLPattern({
    pathname: "/:siteIdentifier/:scope/*",
  });
  const parsedRoute = pattern.exec({
    pathname: routeInfo.pathname,
  });
  log.debug("parsedRoute", parsedRoute);
  if (!parsedRoute) {
    throw new NotFound("Not found matached route");
  }
  const parsedPathnameGroups = parsedRoute.pathname.groups;
  const siteIdentifier = parsedPathnameGroups.siteIdentifier;
  const scope = parsedPathnameGroups.scope;
  const value = parsedPathnameGroups[0];
  let itemsFilePath = "";
  let pageType = "index.html";
  let id = "";
  if (
    scope === "tags" || scope === "issues" || scope === "archive" ||
    scope === "posts"
  ) {
    let rootFolder = scope;
    if (scope === "posts") {
      rootFolder = "archive";
    }

    // get items.json path
    if (value.endsWith("/")) {
      itemsFilePath = `${rootFolder}/${value}items.json`;
    } else {
      // replace .html with .json
      const basename = posixPath.basename(value);
      const parentPath = posixPath.dirname(value);
      pageType = basename;

      itemsFilePath = `${rootFolder}/${parentPath}/items.json`;
    }

    if (scope === "posts") {
      const parentPath = posixPath.dirname(itemsFilePath);
      id = posixPath.basename(parentPath);
      itemsFilePath = posixPath.join(
        posixPath.dirname(parentPath),
        "items.json",
      );
    }
  }
  const meta: Record<string, string> = {};
  if (id) {
    meta.id = id;
  }
  if (itemsFilePath) {
    let pagePathname = routeInfo.pathname;

    if (pagePathname.endsWith(pageType)) {
      pagePathname = pagePathname.slice(0, -pageType.length);
    }
    // pathname /feed.json
    // pagePathName will be /
    // pathname /feed.xml
    // pagePathName will be /
    // pagePathname,
    return {
      ...routeInfo,
      siteIdentifier,
      itemsFilePath: getArchivedFilePath(siteIdentifier, itemsFilePath),
      pageType,
      scope,
      meta,
      pagePathname,
    };
  } else {
    throw new NotFound("Not found matached route");
  }
}

export function getSourceLinks(siteIdentifier: string, config: Config): Link[] {
  const links: Link[] = [];
  const sourceLinksMap: Record<string, Source> = {};
  for (const source of config.sources) {
    sourceLinksMap[source.id] = source;
  }

  const siteConfig = config.sites[siteIdentifier];

  if (!siteConfig) {
    throw new NotFound("Site " + siteIdentifier + " not found");
  }
  const siteTags = siteConfig.tags || [];
  for (const tag of siteTags) {
    const source = sourceLinksMap[tag];
    if (source) {
      if (!Array.isArray(source.api)) {
        source.api = [source.api];
      }

      for (const api of source.api) {
        links.push({
          name: api.name,
          url: api.home_page_url,
        });
      }
    }
  }

  return links;
}
export function liteUrlToUrl(
  url: string,
  versions: Version[],
  languages: Language[],
): string {
  const parsed = parsePageUrl(url, versions, languages);

  const urlObj = new URL(parsed.url);
  const language = parsed.language;
  const pathname = urlObj.pathname;

  urlObj.pathname = `/${language.prefix}${pathname.slice(1)}`;

  return urlObj.href;
}

export function getDuplicatedRule(
  rules: Rule[],
): string | undefined {
  let deduplicateRule: Rule | undefined;
  for (const rule of rules) {
    if (rule.type === "deduplicate") {
      deduplicateRule = rule;
      break;
    }
  }
  let deduplicate: string | undefined;
  if (deduplicateRule) {
    deduplicate = deduplicateRule.value as string;
  }
  return deduplicate;
}
export function hasSameKeys<T>(
  currentKeysMap: Map<string, T>,
  newKeys: string[],
  deduplicate = "or",
): T[] {
  const currentKeys = Array.from(currentKeysMap.keys());
  const sameKeys = currentKeys.filter((key) => newKeys.includes(key));
  if (sameKeys.length >= newKeys.length) {
    // all match
    return sameKeys.map((key) => currentKeysMap.get(key)!);
  } else {
    // part match
    if (deduplicate === "and") {
      return [];
    }
    return sameKeys.map((key) => currentKeysMap.get(key)!);
  }
}

export function getSiteIdentifierByRelativePath(relativePath: string): string {
  const siteIdentifier = relativePath.split(path.sep)[0];
  return siteIdentifier;
}
export function formatId(id: string): string {
  let isUrl = false;
  try {
    const url = new URL(id);
    isUrl = true;
  } catch (_e) {
    // not url
  }

  if (isUrl) {
    const url = new URL(id);
    id = url.hostname.replace(/\./g, "-") + "-" +
      url.pathname.replace(/\//g, "-");
  }
  if (id) {
    id = id.replace(/[^a-zA-Z0-9-]/g, "-");

    // if id is too long, use md5
    if (id.length > 200) {
      return id.slice(0, 200);
    }
  }
  return id;
}
