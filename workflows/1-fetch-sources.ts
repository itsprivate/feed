import {
  ItemsJson,
  RunOptions,
  Source,
  SourceAPIConfig,
  Task,
} from "../interface.ts";
import adapters from "../adapters/mod.ts";
import {
  get,
  getCurrentItemsFilePath,
  getDataTranslatedPath,
  identifierToCachedKey,
  isDev,
  readJSONFile,
  request,
  writeJSONFile,
} from "../util.ts";
import Item from "../item.ts";
import filterByRules from "../filter-by-rules.ts";
import { fs, parseFeed, SimpleTwitter } from "../deps.ts";
import log from "../log.ts";
import fetchPHData from "../sources/fetch-ph.ts";
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

  const currentKeysMap = new Map<string, boolean>();
  const targetSiteIdentifiersMap = new Map<string, string[]>();
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
        let currentItemsJson: ItemsJson = {
          items: {},
        };
        try {
          currentItemsJson = await readJSONFile(currentItemsPath);
        } catch (e) {
          log.debug(`read current items file failed, ${e.message}`);
        }
        for (const key of Object.keys(currentItemsJson.items)) {
          currentKeysMap.set(identifierToCachedKey(key), true);
        }
      }
    } else {
      log.info(`site ${siteIdentifier} is dev only, skip fetch sources`);
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

    // also get current translated path
    // is exists translated file
    // ensure folder exists
    await fs.ensureDir(getDataTranslatedPath());
    for await (
      const entry of fs.walk(getDataTranslatedPath())
    ) {
      if (entry.isFile) {
        const key = entry.name.replace(/\.json$/, "");
        currentKeysMap.set(identifierToCachedKey(key), true);
      }
    }
    log.debug(sourceId + ` current keys length: ${currentKeysMap.size}`);
    // fetch source, and parse it to item;
    for (const sourceApiConfig of sourceUrls) {
      const sourceUrl = sourceApiConfig.url;
      let total = 0;
      let originalJson;
      if (
        sourceType === "rss" || sourceType === "googlenews" ||
        sourceType === "newyorker" || sourceType === "lobste"
      ) {
        const originItemResult = await request(sourceUrl);

        const xml = await originItemResult.text();
        originalJson = await parseFeed(xml);
        itemsPath = "entries";
      } else if (sourceType === "twitter") {
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
          // since_id,
          count: 100,
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
        // @ts-ignore: ignore quoted type
        originalJson = result.filter((item) => {
          return item.is_quote_status === false;
        });
      } else if (sourceType === "ph") {
        // producthunt graphql api
        originalJson = await fetchPHData();
      } else {
        const originItemResult = await request(sourceUrl);
        originalJson = await originItemResult.json();
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
      originalItems = filterByRules(
        // @ts-ignore: hard to type
        originalItems.map((originalItem) =>
          new (adapters[sourceType])(
            originalItem,
          )
        ),
        rules,
      ) as Item<unknown>[];
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

      for (const item of (originalItems as Item<unknown>[])) {
        await item.init();

        if (!currentKeysMap.get(item.getCachedKey())) {
          // not exists
          // save original item to file
          await writeJSONFile(
            item.getRawPath(targetSiteIdentifiersMap.get(sourceId)!, itemOrder),
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
        } else {
          log.debug(`${item.getCachedKey()} exists, skip`);
        }
      }
      log.info(
        `saved ${total} items by unique keys`,
      );
    }
  }
  return { postTasks };
}
