import {
  ItemsJson,
  RunOptions,
  Source,
  SourceAPIConfig,
  SourceStat,
  SourceStatGroup,
  Stat,
  Task,
} from "../interface.ts";
import adapters from "../adapters/mod.ts";
import SourceItemAdapter from "../adapters/source.ts";
import {
  get,
  getCurrentItemsFilePath,
  getCurrentKeysFilePath,
  getDataPath,
  getDataRawPath,
  getDataStatsPath,
  getDataTranslatedPath,
  getRecentlySiteStatPath,
  getRecentlySourcesStatPath,
  getSiteIdentifierByRelativePath,
  hasSameKeys,
  identifierToCachedKey,
  isDev,
  parseItemIdentifier,
  parseItemIdentifierWithTime,
  readJSONFile,
  request,
  writeJSONFile,
} from "../util.ts";
import Item from "../item.ts";
import filterByRules from "../filter-by-rules.ts";
import { fs, parseFeed, path, SimpleTwitter } from "../deps.ts";
import log from "../log.ts";
import fetchPHData from "../sources/fetch-ph.ts";
import { getTweets as fetchTwitterV2Data } from "../sources/fetch-twitter.ts";
export default async function fetchSources(
  options: RunOptions,
): Promise<{ postTasks: Task[] }> {
  const config = options.config;
  const sitesMap = config.sites;
  const siteIdentifiers = options.siteIdentifiers;
  const sources = config.sources;
  const postTasks: Task[] = [];
  let filteredSources: Source[] = [];
  const sourcesMap = new Map<string, Source>();
  for (const source of sources) {
    sourcesMap.set(source.id, source);
  }

  const currentKeysMap = new Map<string, Map<string, boolean>>();
  const currentRawKeysMap = new Map<string, Map<string, string[]>>();
  const targetSiteIdentifiersMap = new Map<string, string[]>();
  const now = new Date();
  const statChcedAt = now.toISOString();
  const checkedYear = now.getUTCFullYear();
  const checkedMonth = now.getUTCMonth() + 1;
  let stat: Stat = {};
  const statPath = getDataStatsPath(checkedYear);
  try {
    const statContent = await readJSONFile(statPath);
    stat = statContent as Stat;
  } catch (_e) {
    // ignore
  }
  if (!stat[checkedMonth]) {
    stat[checkedMonth] = {};
  }
  let recentlySources: SourceStatGroup[] = [];
  const currentSourceStatGroup: SourceStatGroup = {
    t: statChcedAt,
    s: {},
  };

  const recentlySourcesPath = getRecentlySourcesStatPath();
  try {
    const recentlySourcesContent = await readJSONFile(recentlySourcesPath);
    recentlySources = recentlySourcesContent as SourceStatGroup[];
  } catch (_e) {
    // ignore
  }

  for (const siteIdentifier of siteIdentifiers) {
    const siteConfig = sitesMap[siteIdentifier];
    const siteIsOnlyDev = siteConfig.dev && !isDev();
    const siteTags = siteConfig.tags || [];
    const siteSources: Source[] = [];
    if (!siteIsOnlyDev) {
      // only take prod
      for (const siteTag of siteTags) {
        const source = sourcesMap.get(siteTag);
        if (source) {
          siteSources.push(source);
          if (!targetSiteIdentifiersMap.has(siteTag)) {
            targetSiteIdentifiersMap.set(siteTag, []);
          }
          if (
            !targetSiteIdentifiersMap.get(siteTag)!.includes(siteIdentifier)
          ) {
            targetSiteIdentifiersMap.get(siteTag)!.push(siteIdentifier);
          }
        }
      }

      if (siteSources.length === 0) {
        log.info(`site ${siteIdentifier} has no sources, skip fetch sources`);
      } else {
        filteredSources = filteredSources.concat(siteSources);
        // get current Itemsjson
        const currentItemsPath = getCurrentItemsFilePath(siteIdentifier);
        const currentKeysPath = getCurrentKeysFilePath(siteIdentifier);
        let currentItemsJson: ItemsJson = {
          items: {},
        };
        try {
          currentItemsJson = await readJSONFile(currentItemsPath);
        } catch (e) {
          log.debug(`read current items file failed, ${e.message}`);
        }
        let currentKeyssJson: string[] = [];
        try {
          currentKeyssJson = await readJSONFile(currentKeysPath) as string[];
        } catch (e) {
          // ignore
          log.debug(`read keys json file error: ${e}`);
        }
        const currentItemsKeys = Object.keys(currentItemsJson.items);
        if (currentKeysMap.get(siteIdentifier) === undefined) {
          currentKeysMap.set(siteIdentifier, new Map());
        }
        for (const key of currentItemsKeys) {
          const itemInstance = new SourceItemAdapter(
            currentItemsJson.items[key],
          );
          const cachedKeys = itemInstance.getCachedKeys();
          for (const cachedKey of cachedKeys) {
            currentKeysMap.get(siteIdentifier)!.set(cachedKey, true);
          }
        }
        // all add current keys
        for (const key of currentKeyssJson) {
          currentKeysMap.get(siteIdentifier)!.set(key, true);
        }
      }
    } else {
      log.info(`site ${siteIdentifier} is dev only, skip fetch sources`);
    }
  }
  // also get current translated path
  // is exists translated file
  // ensure folder exists
  await fs.ensureDir(getDataTranslatedPath());
  for await (
    const entry of fs.walk(getDataTranslatedPath())
  ) {
    if (entry.isFile && entry.name.endsWith(".json")) {
      const siteRelativePath = path.relative(
        getDataTranslatedPath(),
        entry.path,
      );
      const siteIdentifier = getSiteIdentifierByRelativePath(siteRelativePath);
      const fileContent = await readJSONFile(entry.path);
      const fileInstance = new SourceItemAdapter(fileContent);
      const cachedKeys = fileInstance.getCachedKeys();
      if (!currentKeysMap.has(siteIdentifier)) {
        currentKeysMap.set(siteIdentifier, new Map());
      }
      for (const cachedKey of cachedKeys) {
        currentKeysMap.get(siteIdentifier)!.set(cachedKey, true);
      }
    }
  }
  // also get current raw keys
  await fs.ensureDir(getDataRawPath());
  for await (
    const entry of fs.walk(getDataRawPath())
  ) {
    if (entry.isFile && entry.name.endsWith(".json")) {
      const filenmae = path.basename(entry.path);
      const parsedFilename = parseItemIdentifierWithTime(filenmae);
      const fileContent = await readJSONFile(entry.path);
      let fileInstance;
      try {
        fileInstance = new adapters[parsedFilename.type](fileContent);
      } catch (e) {
        log.error(`adapter ${parsedFilename.type} failed, ${entry.path}`);
        throw e;
      }
      const cachedKeys = fileInstance.getCachedKeys();
      const entryRelativePath = path.relative(getDataRawPath(), entry.path);
      const targetSiteIdentifiersString = entryRelativePath.split("/")[3];
      const targetSiteIdentifiers = targetSiteIdentifiersString.split("_");
      for (const targetSiteIdentifier of targetSiteIdentifiers) {
        if (!currentRawKeysMap.has(targetSiteIdentifier)) {
          currentRawKeysMap.set(targetSiteIdentifier, new Map());
        }
        for (const itemKey of cachedKeys) {
          if (!currentRawKeysMap.get(targetSiteIdentifier)!.has(itemKey)) {
            currentRawKeysMap.get(targetSiteIdentifier)!.set(itemKey, []);
          }

          currentRawKeysMap.get(targetSiteIdentifier)!.get(itemKey)?.push(
            entry.path,
          );
        }
      }
    }
  }

  const currentRawKeysSiteIdentifiers = currentRawKeysMap.keys();
  for (const siteIdentifier of currentRawKeysSiteIdentifiers) {
    // remove the duplicated old raw file
    const currentMap = currentRawKeysMap.get(siteIdentifier)!;
    for (const [key, paths] of currentMap) {
      if (paths.length > 1) {
        // sort by time
        paths.sort((a, b) => {
          const aKey = path.basename(a).replace(/\.json$/, "");
          const aParsed = parseItemIdentifierWithTime(aKey);
          const aNumber = Number(
            `${aParsed.year}${aParsed.month}${aParsed.day}${aParsed.hour}${aParsed.minute}${aParsed.second}${aParsed.millisecond}`,
          );
          const bKey = path.basename(b).replace(/\.json$/, "");
          const bParsed = parseItemIdentifierWithTime(bKey);
          const bNumber = Number(
            `${bParsed.year}${bParsed.month}${bParsed.day}${bParsed.hour}${bParsed.minute}${bParsed.second}${bParsed.millisecond}`,
          );
          return bNumber - aNumber;
        });
        // remove the rest
        for (let i = 1; i < paths.length; i++) {
          log.info(`remove old raw file ${paths[i]}`);
          try {
            await Deno.remove(paths[i]);
          } catch (_e) {
            // ignore
          }
        }
      }
    }
  }
  // remove 7 days ago raw file

  for (const siteIdentifier of currentRawKeysSiteIdentifiers) {
    // remove the duplicated old raw file
    const currentMap = currentRawKeysMap.get(siteIdentifier)!;
    for (const [key, paths] of currentMap) {
      for (const p of paths) {
        const parsed = parseItemIdentifierWithTime(
          path.basename(p).replace(/\.json$/, ""),
        );
        const parsedDate = new Date(
          Date.UTC(
            Number(parsed.year),
            Number(parsed.month) - 1,
            Number(parsed.day),
            Number(parsed.hour),
            Number(parsed.minute),
            Number(parsed.second),
            Number(parsed.millisecond),
          ),
        );
        const now = new Date();
        const diff = now.getTime() - parsedDate.getTime();
        if (diff > 7 * 24 * 60 * 60 * 1000) {
          // remove all
          log.info(`remove old raw file ${p}`);
          currentRawKeysMap.delete(key);
          try {
            await Deno.remove(p);
          } catch (_e) {
            // ignore
          }
        }
      }
    }
  }

  // unique filteredSources
  filteredSources = Array.from(new Set(filteredSources.map((item) => item.id)))
    .map((id) => sourcesMap.get(id)!);
  let sourceOrder = 0;
  let itemOrder = 0;
  for (const source of filteredSources) {
    sourceOrder++;
    const sourceId = source.id;
    let sourceUrls = source.api as SourceAPIConfig[];
    if (!Array.isArray(sourceUrls)) {
      sourceUrls = [sourceUrls];
    }

    const sourceType = source.type;
    let itemsPath = source.itemsPath || "";
    const rules = source.rules || [];
    // fetch source, and parse it to item;
    for (const sourceApiConfig of sourceUrls) {
      const sourceUrl = sourceApiConfig.url;
      const sourceName = sourceApiConfig.name;
      const sourceStat: SourceStat = {
        raw_count: 0,
        filtered_count: 0,
        unique_count: 0,
        count: 0,
      };

      let total = 0;
      let totalUniqued = 0;
      let originalJson;
      if (
        sourceType === "rss" || sourceType === "googlenews" ||
        sourceType === "newyorker" || sourceType === "lobste"
      ) {
        const originItemResult = await request(sourceUrl);

        const xml = await originItemResult.text();
        originalJson = await parseFeed(xml);
        itemsPath = "entries";
      } else if (
        sourceType === "twittercbarraud" || sourceType === "twitterlink" ||
        sourceType === "twitter" ||
        sourceType === "thechinaproject"
      ) {
        const bearerToken = Deno.env.get("TWITTER_BEARER_TOKEN");
        if (!bearerToken) {
          throw new Error("TWITTER_BEARER_TOKEN is not set");
        }
        const twitterCretials = {
          consumer_key: Deno.env.get("TWITTER_CONSUMER_KEY"),
          consumer_secret: Deno.env.get("TWITTER_CONSUMER_SECRET"),
          access_token: Deno.env.get("TWITTER_ACCESS_TOKEN"),
          access_token_secret: Deno.env.get("TWITTER_ACCESS_TOKEN_SECRET"),
          bearer_token: Deno.env.get("TWITTER_BEARER_TOKEN"),
        };
        const simpleTwitter = new SimpleTwitter(twitterCretials);

        const params = {
          screen_name: sourceUrl,
          exclude_replies: true,
          include_rts: true,
          tweet_mode: "extended",
          // count: 200,
          // since_id,
          ...source.params,
        };
        const result = await new Promise((resolve, reject) => {
          simpleTwitter.get("statuses/user_timeline", params, function (
            error: unknown,
            tweets: unknown,
          ) {
            if (!error) {
              resolve(tweets);
            }
            reject(error);
          });
        });

        // @ts-ignore: ignore
        // then call tweet v2 api to fetch details
        // @ts-ignore: ignore quoted type
        originalJson = result.filter((item) => {
          const isQuoted = item.is_quote_status === true;
          const in_reply_to_status_id = item.in_reply_to_status_id_str;
          const retweet = item.retweeted_status;
          let isRetweetQuoted = false;
          if (
            retweet &&
            (retweet.is_quote_status === true ||
              retweet.in_reply_to_status_id_str)
          ) {
            isRetweetQuoted = true;
          }

          if (isQuoted || in_reply_to_status_id || isRetweetQuoted) {
            return false;
          }
          return true;
        });
        // console.log("originalJson.length", originalJson.length);

        const ids = originalJson.map((item: { id_str: string }) => item.id_str);
        if (ids.length > 0) {
          try {
            const tweetV2Result = await fetchTwitterV2Data(ids);
            originalJson = tweetV2Result;
          } catch (e) {
            log.error(`fetchTwitterV2Data error`, ids);
            throw e;
          }
        } else {
          originalJson = [];
        }
      } else if (sourceType === "ph") {
        // producthunt graphql api
        try {
          originalJson = await fetchPHData();
        } catch (e) {
          log.error(`fetch ph failed`, e);
          continue;
        }
      } else {
        try {
          const originItemResult = await request(sourceUrl);
          originalJson = await originItemResult.json();
        } catch (e) {
          log.error(`fetch ${sourceUrl} error`, e);
          continue;
        }
      }
      // get items
      let originalItems = originalJson;
      let theItemsPath = itemsPath;
      if (!itemsPath) {
        // auto itemsPath
        if (sourceType === "reddit") {
          theItemsPath = "data.children";
        } else if (sourceType === "hn") {
          theItemsPath = "hits";
        } else if (sourceType === "ph") {
          theItemsPath = "data.posts.edges";
        }
      }

      if (theItemsPath) {
        originalItems = get(originalJson, theItemsPath) as Record<
          string,
          unknown
        >[];
      }

      log.info(
        `${sourceOrder}/${filteredSources.length} ${sourceId} fetched ${originalItems.length} raw items from ${sourceUrl} `,
      );
      sourceStat.raw_count = originalItems.length;
      originalItems = filterByRules(
        // @ts-ignore: hard to type
        originalItems.map((originalItem) =>
          new (adapters[sourceType])(
            originalItem,
          )
        ),
        rules,
      ) as Item<unknown>[];

      // if google news limit time
      if (sourceType === "googlenews") {
        let itemsCount = 10;
        originalItems = originalItems.filter(
          (item: Item<unknown>, index: number) => {
            if (sourceId === "source-google-news") {
              return true;
            }

            if (index < itemsCount) {
              return true;
            } else {
              const published = item.getOriginalPublishedDate();
              const now = new Date();
              const diff = now.getTime() - published.getTime();
              return diff < 24 * 60 * 60 * 1000;
            }
          },
        );
      }

      sourceStat.filtered_count = originalItems.length;
      log.info(
        `got ${originalItems.length} valid items by rules`,
      );
      // resort items from old to new , cause we need to keep the order of items
      // @ts-ignore: hard to type
      originalItems = (originalItems).sort((a, b) => {
        const aDate = a.getOriginalPublishedDate();
        const bDate = b.getOriginalPublishedDate();
        if (aDate > bDate) {
          return 1;
        }
        if (aDate < bDate) {
          return -1;
        }
        return 0;
      });

      const targetSiteIdentifiers = targetSiteIdentifiersMap.get(
        sourceId,
      )!;
      const currentMergedRawKeysMap: Map<string, string[]> = new Map();
      const currentmergedKeysMap: Map<string, boolean> = new Map();

      for (const targetSiteIdentifier of targetSiteIdentifiers) {
        const currentRawMap = currentRawKeysMap.get(targetSiteIdentifier);
        if (currentRawMap) {
          const currentRawMapKeys = currentRawMap.keys();
          for (const key of currentRawMapKeys) {
            currentMergedRawKeysMap.set(key, currentRawMap.get(key)!);
          }
        }

        const currentMap = currentKeysMap.get(targetSiteIdentifier);
        if (currentMap) {
          const currentMapKeys = currentMap.keys();
          for (const key of currentMapKeys) {
            currentmergedKeysMap.set(key, true);
          }
        }
      }

      for (const item of (originalItems as Item<unknown>[])) {
        await item.init();
        // check if current raw already has one, delete others

        const duplicatedFiles = hasSameKeys(
          currentMergedRawKeysMap,
          item.getCachedKeys(),
        );
        if (duplicatedFiles.length > 0) {
          // delete all cached files
          const cachedFiles = duplicatedFiles.reduce((acc, cur) => {
            return acc.concat(cur);
          }, []);
          for (const cachedFile of cachedFiles) {
            try {
              await Deno.remove(cachedFile);
              log.info(`remove duplicated raw file: ${cachedFile}`);
            } catch (_e) {
              // ignore
            }
          }
        }
        let duplicatedKeys: boolean[] = [];
        duplicatedKeys = hasSameKeys(
          currentmergedKeysMap,
          item.getCachedKeys(),
        );
        if (duplicatedKeys.length > 0) {
          // log.info(`duplicatedKeys: ${duplicatedKeys}`);
          continue;
        }
        if (duplicatedKeys.length === 0) {
          // filter again, cause some attributes is geted by init()
          totalUniqued++;
          const filterdItems = filterByRules([item], rules);
          if (filterdItems.length > 0) {
            // not exists
            // save original item to file
            await writeJSONFile(
              item.getRawPath(
                targetSiteIdentifiersMap.get(sourceId)!,
                itemOrder,
              ),
              item.getRawItem(),
            );
            log.debug(
              `fetched raw data to ${
                item.getRawPath(
                  targetSiteIdentifiersMap.get(sourceId)!,
                  itemOrder,
                )
              }`,
            );
            itemOrder++;
            total++;
            // add keys to currentKeysMap, so we can check if current item is duplicated
            for (const targetSiteIdentifier of targetSiteIdentifiers) {
              const currentKeys = currentKeysMap.get(targetSiteIdentifier);
              if (!currentKeys) {
                currentKeysMap.set(targetSiteIdentifier, new Map());
              }
              const itemCachedKeys = item.getCachedKeys();

              for (const itemCachedKey of itemCachedKeys) {
                currentKeysMap.get(targetSiteIdentifier)!.set(
                  itemCachedKey,
                  true,
                );
              }
            }
          } else {
            log.info(`remove item ${item.getUrl()} by rules`);
          }
        } else {
          log.debug(`${JSON.stringify(item.getCachedKeys())} exists, skip`);
        }
      }
      sourceStat.count = total;
      sourceStat.unique_count = totalUniqued;
      log.info(
        `saved ${total} items by unique keys and second filter`,
      );
      if (!currentSourceStatGroup.s[source.id]) {
        currentSourceStatGroup.s[source.id] = {};
      }
      if (!currentSourceStatGroup.s[source.id][sourceName]) {
        currentSourceStatGroup.s[source.id][sourceName] = sourceStat;
      }

      // add to site stats
      if (!stat[checkedMonth]) {
        stat[checkedMonth] = {};
      }
      if (!stat[checkedMonth][source.id]) {
        stat[checkedMonth][source.id] = {};
      }
      if (!stat[checkedMonth][source.id][sourceName]) {
        stat[checkedMonth][source.id][sourceName] = {
          count: 0,
          checked_at: statChcedAt,
        };
      }
      // add new
      stat[checkedMonth][source.id][sourceName].count += sourceStat.count;
      stat[checkedMonth][source.id][sourceName].checked_at = statChcedAt;
    }
  }
  recentlySources.unshift(currentSourceStatGroup);

  // write stats to file
  await writeJSONFile(recentlySourcesPath, recentlySources.slice(0, 1000));
  await writeJSONFile(statPath, stat);
  return { postTasks };
}
