import { ItemsJson, Rule, RunOptions, Source, Task } from "../interface.ts";
import adapters from "../adapters/mod.ts";
import {
  get,
  getCurrentItemsFilePath,
  getDataTranslatedPath,
  readJSONFile,
  writeJSONFile,
} from "../util.ts";
import { fs, parseFeed, SimpleTwitter } from "../deps.ts";
import log from "../log.ts";
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
    const siteTags = siteConfig.tags || [];
    const siteSources: Source[] = [];
    for (const siteTag of siteTags) {
      const source = sourcesMap.get(siteTag);
      if (source) {
        siteSources.push(source);

        if (!targetSiteIdentifiersMap.has(siteTag)) {
          targetSiteIdentifiersMap.set(siteTag, []);
        }
        if (!targetSiteIdentifiersMap.get(siteTag)!.includes(siteIdentifier)) {
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
        currentKeysMap.set(key, true);
      }
    }
  }

  // unique filteredSources
  filteredSources = Array.from(new Set(filteredSources.map((item) => item.id)))
    .map((id) => sourcesMap.get(id)!);

  for (const source of filteredSources) {
    const sourceId = source.id;
    let total = 0;
    let sourceUrls = source.url as string[];
    if (typeof sourceUrls === "string") {
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
        currentKeysMap.set(key, true);
      }
    }
    log.info(`current keys length: ${currentKeysMap.size}`);
    // fetch source, and parse it to item;
    for (const sourceUrl of sourceUrls) {
      let originalJson;
      if (sourceType === "rss" || sourceType === "googlenews") {
        const originItemResult = await fetch(sourceUrl);

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
          count: 200,
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
        originalJson = result;
      } else {
        const originItemResult = await fetch(sourceUrl);
        originalJson = await originItemResult.json();
      }

      // get items
      let originalItems = originalJson;
      if (itemsPath) {
        originalItems = get(originalJson, itemsPath) as Record<
          string,
          unknown
        >[];
      }

      log.info(
        `fetched ${originalItems.length} items from ${sourceId} `,
      );

      let limitRule: Rule | undefined;
      for (const rule of rules) {
        if (rule.type === "limit") {
          limitRule = rule;
          break;
        }
      }

      if (limitRule) {
        originalItems = originalItems.slice(0, Number(limitRule.value));
      }

      for (const originalItem of originalItems) {
        // check rules
        let isAllRulesFine = true;
        for (const rule of rules) {
          const { key: thekey, value: theValue, type } = rule;
          if (!thekey) {
            continue;
          }
          const key = thekey!;
          const originalValue = get(originalItem, key);
          const value = theValue as string;
          if (type === "greater") {
            if (Number(originalValue) <= Number(value)) {
              isAllRulesFine = false;
              break;
            }
          } else if (type === "equal") {
            if (originalValue !== value) {
              isAllRulesFine = false;
              break;
            }
          } else if (type === "notEqual") {
            if (originalValue === value) {
              isAllRulesFine = false;
              break;
            }
          } else if (type === "include") {
            if (!(originalValue as string[]).includes(value)) {
              isAllRulesFine = false;
              break;
            }
          } else if (type === "notInclude") {
            if ((originalValue as string[]).includes(value)) {
              isAllRulesFine = false;
              break;
            }
          } else if (type === "notExist") {
            if (originalValue) {
              isAllRulesFine = false;
              break;
            }
          } else if (type === "exist") {
            if (!originalValue) {
              isAllRulesFine = false;
              break;
            }
          } else if (type === "notMatch") {
            if ((originalValue as string).match(value)) {
              isAllRulesFine = false;
              break;
            }
          } else if (type === "match") {
            if (!(originalValue as string).match(value)) {
              isAllRulesFine = false;
              break;
            }
          } else if (type === "greaterEqual") {
            if (Number(originalValue) < Number(value)) {
              isAllRulesFine = false;
              break;
            }
          } else if (type === "less") {
            if (Number(originalValue) >= Number(value)) {
              isAllRulesFine = false;
              break;
            }
          } else if (type === "lessEqual") {
            if (Number(originalValue) > Number(value)) {
              isAllRulesFine = false;
              break;
            }
          } else {
            throw new Error(`unknown rule type ${type}`);
          }
        }
        if (!isAllRulesFine) {
          continue;
        }

        // parse item to formated item
        const item = new (adapters[sourceType])(
          originalItem,
        );
        await item.init();

        if (!currentKeysMap.get(item.getItemIdentifier())) {
          // not exists
          // save original item to file
          await writeJSONFile(
            item.getRawPath(targetSiteIdentifiersMap.get(sourceId)!),
            item.getRawItem(),
          );
          log.debug(
            `fetched raw data to ${
              item.getRawPath(targetSiteIdentifiersMap.get(sourceId)!)
            }`,
          );
          total++;
        }
      }
      log.info(
        `saved ${total} items from ${sourceUrl} for ${sourceId}`,
      );
    }
  }
  return { postTasks };
}
