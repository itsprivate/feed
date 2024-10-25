import { fs } from "../deps.ts";
import { FormatedItem, ItemsJson, RunOptions } from "../interface.ts";
import {
  callWithTimeout,
  getCurrentItemsFilePath,
  getDataFormatedPath,
  getDataTranslatedPath,
  getFilesByTargetSiteIdentifiers,
  getTargetSiteIdentifiersByFilePath,
  hasSameKeys,
  parseItemIdentifier,
  readJSONFile,
  writeJSONFile,
} from "../util.ts";
import log from "../log.ts";
import SourceItemAdapter from "../adapters/source.ts";
// import D from "../d.ts";
import DPro from "../dp.ts";

export default async function translateItems(options: RunOptions) {
  const config = options.config;
  // get all 2-formated files
  // is exists formated files folder
  await fs.ensureDir(getDataFormatedPath());
  const sites = options.siteIdentifiers || [];
  const { files, targetSiteIdentifiers } =
    await getFilesByTargetSiteIdentifiers(getDataFormatedPath(), sites);

  if (files.length > 0) {
    const currentTranslationsMap = new Map<
      string,
      Record<string, Record<string, string>>
    >();

    // get current translated files

    for await (const entry of fs.walk(getDataTranslatedPath())) {
      if (entry.isFile && entry.name.endsWith(".json")) {
        const translationJson = (await readJSONFile(
          entry.path,
        )) as FormatedItem;

        if (translationJson._translations && translationJson.id) {
          const parsed = parseItemIdentifier(translationJson.id);
          const itemInstance = new SourceItemAdapter(translationJson);
          const cachedKeys = itemInstance.getCachedKeys();

          for (const cachedKey of cachedKeys) {
            currentTranslationsMap.set(
              cachedKey,
              translationJson._translations,
            );
          }
        }
      }
    }
    const translationFolderCachedSize = currentTranslationsMap.size;
    log.info(`found ${translationFolderCachedSize} cached translation files`);

    // get current Itemsjson
    for (const siteIdentifier of targetSiteIdentifiers) {
      const currentItemsPath = getCurrentItemsFilePath(siteIdentifier);
      const siteConfig = config.sites[siteIdentifier];
      let currentItemsJson: ItemsJson = {
        items: {},
      };
      try {
        currentItemsJson = await readJSONFile(currentItemsPath);
      } catch (e) {
        log.debug(`read current items file failed, ${e.message}`);
      }
      const itemsKeys = Object.keys(currentItemsJson.items);
      for (const key of itemsKeys) {
        const currentItem = currentItemsJson.items[key];
        if (currentItem._translations) {
          const itemInstance = new SourceItemAdapter(currentItem);
          const cachedKeys = itemInstance.getCachedKeys();

          for (const cachedKey of cachedKeys) {
            currentTranslationsMap.set(cachedKey, currentItem._translations);
          }
        }
      }
    }

    log.info(
      `found ${currentTranslationsMap.size} current  items translated Cache`,
    );

    // yes
    // start instance
    // const translation = new Translation();
    // await translation.init();
    const translation = new DPro();

    let total = 0;
    let translateWithAPITotal = 0;
    let failedTotal = 0;
    let translateWithCacheTotal = 0;
    log.info(`start translate ${files.length} items`);
    const TRANSLATE_COUNT_ENV = Deno.env.get("TRANSLATE_COUNT");
    let translateCountLimit = -1;
    if (TRANSLATE_COUNT_ENV) {
      translateCountLimit = parseInt(TRANSLATE_COUNT_ENV);
    }
    let translateTimeout = 120; // default 120 minutes
    const TRANSLATE_TIMEOUT_ENV = Deno.env.get("TRANSLATE_TIMEOUT");
    if (TRANSLATE_TIMEOUT_ENV) {
      translateTimeout = parseInt(TRANSLATE_TIMEOUT_ENV); // in minutes
    }
    const startTime = Date.now();

    for (const file of files) {
      total += 1;
      // check is timeout
      if (translateTimeout > 0) {
        const elapsedTime = (Date.now() - startTime) / 1000 / 60;
        if (elapsedTime > translateTimeout) {
          log.info(
            `translate timeout, elapsed time: ${elapsedTime} minutes, expect time: ${translateTimeout} minutes`,
          );
          break;
        }
      }

      const item = (await readJSONFile(file)) as FormatedItem;

      const itemInstance = new SourceItemAdapter(item);
      const originalTranslations = (
        item._translations ? item._translations[item._original_language] : {}
      ) as Record<string, string>;
      const originalTranslationKeys = Object.keys(originalTranslations);
      // try to find 3-translations to get cached items

      // write translated item to file
      const targetSiteIdentifiers = getTargetSiteIdentifiersByFilePath(file);
      const translatedPath = itemInstance.getTranslatedPath(
        targetSiteIdentifiers,
      );
      const translations = {
        ...item._translations,
      };

      const sameKeys = hasSameKeys(
        currentTranslationsMap,
        itemInstance.getCachedKeys(),
        "and",
      );
      if (sameKeys.length > 0) {
        const cachedTranslations = sameKeys[0];
        if (cachedTranslations) {
          const cachedKeys = Object.keys(cachedTranslations);
          for (const key of cachedKeys) {
            if (!translations[key]) {
              log.debug(
                `use cached translation for ${key}`,
                cachedTranslations[key],
              );
              translations[key] = {
                ...cachedTranslations[key],
                ...translations[key],
              };
            }
          }
        }
      }
      const translatedJson = {
        ...item,
      } as Record<string, unknown>;

      let isTranslated = true;
      if (Deno.env.get("NO_TRANSLATE") === "1") {
        isTranslated = false;
      }
      let isTranslateSuccess = false;
      if (!isTranslated) {
        // do nothing
        isTranslateSuccess = true;
      } else {
        for (const field of originalTranslationKeys) {
          // first check if this field is translated
          const todoLanguages = [];
          for (const language of config.languages) {
            if (language.code === item._original_language) {
              continue;
            }

            if (
              translations[language.code] &&
              translations[language.code][field] !== undefined
            ) {
              // yes already translated
              // log.debug(`field ${field} already translated, skip`);
              continue;
            }

            todoLanguages.push(language);
          }
          // if todoLanguages is empty, skip
          if (todoLanguages.length === 0) {
            log.info(
              `${total}/${files.length} ${file} use cached translation, skip`,
            );
            translateWithCacheTotal++;
            isTranslateSuccess = true;
            continue;
          }

          const value = originalTranslations[field];
          log.info(`translating ${file} ${field}: ${value} `);
          // set timeout, max 100s
          try {
            const translated = await callWithTimeout<Record<string, string>>(
              translation.translate.bind(
                translation,
                value,
                item._original_language,
                todoLanguages.map((item) => item.code),
              ),
              100000,
            );

            for (const languageCode of Object.keys(translated)) {
              if (!translations[languageCode]) {
                translations[languageCode] = {};
              }
              translations[languageCode][field] = translated[languageCode];
            }
            // real total
            translateWithAPITotal += 1;
            isTranslateSuccess = true;

            log.info(`${total}/${files.length} translated result:`, translated);
            if (translateWithAPITotal % 10 === 0) {
              log.info(`translated ${translateWithAPITotal} items `);
            }
          } catch (e) {
            isTranslateSuccess = false;
            failedTotal++;
            log.warn(
              `${total}/${files.length} translate ${file} ${value} failed`,
            );
            log.warn(e);
            throw e;
          }
        }
      }

      if (isTranslateSuccess) {
        if (translations && Object.keys(translations).length > 0) {
          const languages = Object.keys(translations);
          for (const language of languages) {
            const translation = translations[language];
            if (translation && Object.keys(translation).length > 0) {
              const keys = Object.keys(translation);
              for (const key of keys) {
                if (key === "title") {
                  const sanitized = sanitizeTitle(translation[key]);
                  translation[key] = sanitized.title;
                }
              }
            }
          }
        }

        translatedJson._translations = translations;
        //

        await writeJSONFile(translatedPath, translatedJson);
        // remove formated file
        await Deno.remove(file);
        if (translateCountLimit > 0 && total >= translateCountLimit) {
          log.info(
            `translated ${total} items, limit ${translateCountLimit}, break`,
          );
          break;
        }
      }
    }

    // close instance
    log.info(
      `translated ${total} items, failed ${failedTotal} items, use api: ${translateWithAPITotal}, use cache: ${translateWithCacheTotal}`,
    );

    // await translation.close();
  }
}

/**
 * 标题处理函数的配置选项接口
 */
interface SanitizeOptions {
  /** 最大标题长度 */
  maxLength?: number;
  /** 是否保留 emoji */
  keepEmoji?: boolean;
  /** 自定义替换规则 */
  customReplacements?: Array<[string | RegExp, string]>;
}

/**
 * 处理结果接口
 */
interface SanitizeResult {
  /** 处理后的标题 */
  title: string;
  /** 是否被截断 */
  truncated: boolean;
  /** 原始长度 */
  originalLength: number;
  /** 处理后长度 */
  finalLength: number;
}

/**
 * 安全处理用户提交的标题
 * @param title - 原始标题
 * @param options - 配置选项
 * @returns 处理后的结果对象
 * @throws {Error} 当输入标题不是字符串类型时抛出错误
 */
function sanitizeTitle(
  title: string,
  options: SanitizeOptions = {},
): SanitizeResult {
  // 类型检查
  if (typeof title !== "string") {
    throw new TypeError("Title must be a string");
  }

  const {
    maxLength = 400,
    keepEmoji = false,
    customReplacements = [],
  } = options;

  const originalLength = title.length;
  let sanitized = title;

  // 去除 HTML 标签
  sanitized = sanitized.replace(/<[^>]*>/g, "");

  // 去除首尾空格
  sanitized = sanitized.trim();

  // 根据 keepEmoji 选项决定是否保留表情符号
  if (!keepEmoji) {
    // 移除 emoji 和特殊 Unicode 字符
    sanitized = sanitized.replace(
      /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}]/gu,
      "",
    );
  }

  // 过滤特殊字符，只保留基本标点符号和文字
  sanitized = sanitized.replace(/[^\p{L}\p{N}\p{P}\p{Z}]/gu, "");

  // 将多个空格替换为单个空格
  sanitized = sanitized.replace(/\s+/g, " ");

  // 应用自定义替换规则
  for (const [pattern, replacement] of customReplacements) {
    sanitized = sanitized.replace(pattern, replacement);
  }

  // 转义数据库敏感字符
  sanitized = sanitized
    .replace(/'/g, "''") // SQL 注入防护
    .replace(/\\/g, "\\\\") // 反斜杠转义
    .replace(/\x00/g, "") // 移除 null 字节
    .replace(/\x1a/g, ""); // 移除 ctrl+Z

  const wasTruncated = sanitized.length > maxLength;

  // 截断超长标题
  if (wasTruncated) {
    sanitized = sanitized.substring(0, maxLength);
  }

  return {
    title: sanitized,
    truncated: wasTruncated,
    originalLength,
    finalLength: sanitized.length,
  };
}
