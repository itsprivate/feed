import {
  DateTimeFormatter,
  fs,
  OpenCC,
  path,
  resize,
  slug,
  YAML,
} from "./deps.ts";
import { Config, FormatedItem } from "./interface.ts";
// @ts-ignore: npm module
const zhHansToZhHant = OpenCC.Converter({ from: "cn", to: "tw" });
export const toZhHant = (text: string): string => {
  return zhHansToZhHant(text);
};
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
  return Deno.env.get("DEV") === "1";
};
export const isMock = () => {
  return !(Deno.env.get("MOCK") === "0");
};
export const isDebug = () => {
  return Deno.env.get("DEBUG") === "1";
};
export const getDataPath = () => {
  const dataPath = isDev() ? "dev-data" : "data";
  return dataPath;
};
export const getDistPath = () => {
  return "dist";
};
export const getDomainDistPath = (domain: string) => {
  return `${getDistPath()}/${domainToPath(domain)}`;
};
export const getDistFilePath = (domain: string, file: string) => {
  return path.join(getDistPath(), domainToPath(domain), file);
};
export const getDataRawPath = () => {
  return `${getDataPath()}/1-raw`;
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
  return `${getDataPath()}/2-formated`;
};
export const getDataTranslatedPath = () => {
  return `${getDataPath()}/3-translated`;
};
export const getDataCurrentItemsPath = () => {
  return `${getDataPath()}/4-current`;
};
export const getDataArchivePath = () => {
  return `${getDataPath()}/5-archive`;
};
export const getCurrentItemsFilePath = (targetSite: string) => {
  return `${getDataCurrentItemsPath()}/${domainToPath(targetSite)}/items.json`;
};
export const getCurrentToBeArchivedItemsFilePath = (targetSite: string) => {
  return `${getDataCurrentItemsPath()}/${
    domainToPath(targetSite)
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
  await Deno.writeTextFile(filePath, file);
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
export const getConfigSync = function (): Config {
  const config = YAML.parse(
    Deno.readTextFileSync("config.yml"),
  ) as Config;
  return config;
};
const formatBeijing = (date: Date, formatString: string) => {
  date = new Date(date.getTime() + 8 * 60 * 60 * 1000);
  const formatter = new DateTimeFormatter(formatString);
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

export const generateIcons = async function (domain: string) {
  const icon = await Deno.readFile(`./static/${domainToPath(domain)}/icon.png`);
  // copy icon to dist
  await Deno.writeFile(getDistFilePath(domain, "icon.png"), icon);
  // generate apple-touch-icon
  const appleTouchIcon = await resize(icon, {
    width: 180,
    height: 180,
  });
  await Deno.writeFile(
    getDistFilePath(domain, "apple-touch-icon.png"),
    appleTouchIcon,
  );
  const favicon32 = await resize(icon, {
    width: 32,
    height: 32,
  });
  // write to file

  await Deno.writeFile(
    getDistFilePath(domain, "favicon.ico"),
    favicon32,
  );
};

export const getArchivedFilePath = function (
  domain: string,
  relativePath: string,
): string {
  let filePath = getDataArchivePath() + "/" + domainToPath(domain);
  // remove relative path slashes
  if (relativePath.startsWith("/")) {
    relativePath = relativePath.substring(1);
  }
  filePath += "/" + relativePath;
  return filePath;
};

export const domainToPath = (domain: string) => {
  // return domain.replace(/\./g, "_");
  return domain;
};
export const pathToDomain = (path: string) => {
  // return path.replace(/_/g, ".");
  return path;
};
export const arrayToObj = <T>(
  arr: Record<string, T>[],
  key = "id",
): Record<string, Record<string, T>> => {
  const obj: Record<string, Record<string, T>> = {};
  for (const item of arr) {
    obj[item[key] as unknown as string] = item;
  }
  return obj;
};
export const getCurrentTranslations = function (
  domain: string,
  languageCode: string,
  config: Config,
): Record<string, string> {
  let currentTranslations: Record<string, string> = {};
  const translations = config.translations;
  const sitesMap = config.sites;
  const siteConfig = sitesMap[domain];
  if (languageCode === "zh-Hant") {
    const generalTranslations = translations["zh-Hans"] ?? {};
    currentTranslations = {
      ...generalTranslations,
      ...siteConfig.translations["zh-Hans"],
    };
    // translate to traditional chinese
    for (const key in currentTranslations) {
      currentTranslations[key] = toZhHant(currentTranslations[key]);
    }
  } else {
    // merge site translations
    const generalTranslations = translations[languageCode] ?? {};

    currentTranslations = {
      ...generalTranslations,
      ...siteConfig.translations[languageCode],
    };
  }
  return currentTranslations;
};
