import { groupBy, jsonfeedToAtom, mustache, path } from "../deps.ts";
import {
  FeedItem,
  Feedjson,
  Rule,
  RunOptions,
  Source,
  SourceAPIConfig,
  SourceStatGroup,
  Stat,
} from "../interface.ts";
import {
  formatHumanTime,
  getCurrentTranslations,
  getDataStatsDirPath,
  getDistFilePath,
  getDistPath,
  getRecentlySourcesStatPath,
  isDev,
  pathToSiteIdentifier,
  readJSONFile,
  resortSites,
  siteIdentifierToDomain,
  siteIdentifierToUrl,
  writeJSONFile,
  writeTextFile,
} from "../util.ts";
import log from "../log.ts";
import feedToHTML from "../feed-to-html.ts";
import { indexSubDomain } from "../constant.ts";
import copyStaticAssets from "../copy-static-assets.ts";

interface API extends SourceAPIConfig {
  name: string;
  rules: Rule[];
}
interface APIInfo extends API {
  count: number;
}

interface SiteStatInfo {
  site_identifier: string;
  site_title: string;
  daily_count: number;
  data: string;
  apis: APIInfo[];
}
export default async function buildSite(options: RunOptions) {
  const config = options.config;
  const indexConfig = config.sites[indexSubDomain];
  let siteIdentifiers: string[] = [];
  const now = new Date();
  const indexTemplateString = await Deno.readTextFile(
    "./templates/root-index.html.mu",
  );

  const statsTemplateString = await Deno.readTextFile(
    "./templates/stats.html",
  );
  for await (const dirEntry of Deno.readDir(getDistPath())) {
    if (dirEntry.isDirectory && !dirEntry.name.startsWith(".")) {
      // only build changed folder

      siteIdentifiers.push(pathToSiteIdentifier(dirEntry.name));
    }
  }

  // filter
  if (!isDev()) {
    siteIdentifiers = siteIdentifiers.filter((siteIdentifier) => {
      return !config.sites[siteIdentifier].dev;
    });
  }
  // filter standalone
  siteIdentifiers = siteIdentifiers.filter((siteIdentifier) => {
    return !config.sites[siteIdentifier].standalone;
  });

  // resort
  siteIdentifiers = resortSites(siteIdentifiers, config);

  // multiple languages support
  const languages = config.languages;

  for (const language of languages) {
    const version = config.versions[0];
    const liteVersion = config.versions[1];
    const pathname = "/" + language.prefix;
    const currentIndexTranslations = getCurrentTranslations(
      indexSubDomain,
      language.code,
      config,
    );
    const feedJson: Feedjson = {
      "version": "https://jsonfeed.org/version/1",
      "title": currentIndexTranslations.title,
      "description": currentIndexTranslations.description,
      "icon": siteIdentifierToUrl(indexSubDomain, "/icon.png", config),
      "favicon": siteIdentifierToUrl(indexSubDomain, "/favicon.ico", config),
      "_latest_build_time": now.toISOString(),
      "language": language.code,
      "_site_version": "default",
      "home_page_url": siteIdentifierToUrl(
        indexSubDomain,
        pathname,
        config,
      ),
      "feed_url": siteIdentifierToUrl(
        indexSubDomain,
        `${pathname}feed.json`,
        config,
      ),
      items: [],
      _sources: [],
    };
    // @ts-ignore: add meta
    feedJson._is_lite = feedJson._site_version === liteVersion.code;
    // @ts-ignore: add meta
    feedJson._advice_url = config.advice_url;
    // @ts-ignore: add meta
    feedJson._title_suffix = " - " + currentIndexTranslations.description;
    if (indexConfig.tags) {
      feedJson._site_tags = indexConfig.tags;
    }
    let feedItems: FeedItem[] = [];
    for (const siteIdentifier of siteIdentifiers) {
      const currentFeedJsonPath = path.join(
        getDistPath(),
        siteIdentifier,
        language.prefix,
        version.prefix,
        "feed.json",
      );
      let siteFeedJson: Feedjson;
      try {
        siteFeedJson = await readJSONFile(
          currentFeedJsonPath,
        ) as Feedjson;
      } catch (e) {
        log.info(`can not read feed.json file: ${currentFeedJsonPath}`);
        throw e;
      }

      // format summary, content_text newline with <br>
      feedItems = feedItems.concat(
        siteFeedJson.items.map((item) => {
          item.content_html = item._lite_content_html || item.content_html;
          // @ts-ignore: add meta
          item._site_identifier = siteIdentifier;
          // @ts-ignore: add meta
          item._human_time = formatHumanTime(
            new Date(item._original_published),
          );
          return item;
        }),
      );
    }
    // format format _groups
    // @ts-ignore: add meta
    const groups = groupBy(feedItems, "_site_identifier");

    // @ts-ignore: add meta
    feedJson._groups = Object.keys(groups).map((siteIdentifier) => {
      const currentTranslations = getCurrentTranslations(
        siteIdentifier,
        language.code,
        config,
      );
      const takedCount = 10;
      const takedItems = groups[siteIdentifier].slice(0, takedCount).map(
        (item: FeedItem, index: number) => {
          // @ts-ignore: add meta
          item.order = index + 1;
          return item;
        },
      );
      const remainingCount = groups[siteIdentifier].length - takedCount;
      feedJson.items = feedJson.items.concat(takedItems);
      return {
        "title": currentTranslations.title,
        "hostname": siteIdentifierToDomain(siteIdentifier),
        "site_identifier": siteIdentifier,
        "home_page_url": siteIdentifierToUrl(
          siteIdentifier,
          pathname,
          config,
        ),
        "atom_url": siteIdentifierToUrl(
          siteIdentifier,
          `${pathname}feed.xml`,
          config,
        ),
        "home_page_lite_url": siteIdentifierToUrl(
          siteIdentifier,
          pathname + liteVersion.prefix,
          config,
        ),
        "remaining_count": remainingCount,
        // @ts-ignore: add meta
        "remaining_label": mustache.render(
          currentTranslations.more_posts_label,
          {
            "count": remainingCount,
          },
        ),
        items: takedItems,
      };
    });
    // write to dist file
    const feedPath = getDistFilePath(
      indexSubDomain,
      `${language.prefix}feed.json`,
    );
    await writeJSONFile(feedPath, feedJson);
    feedJson.items = feedJson.items.map((item) => {
      item.summary = item.summary.replace(/\n/g, "&lt;br&gt;");
      // @ts-ignore: must
      delete item.content_text;
      if (item.date_modified === item.date_published) {
        // @ts-ignore: must
        delete item.date_modified;
      }
      const originalLanguage = item._original_language;
      let originalTitle = "";
      if (originalLanguage) {
        if (originalLanguage !== language.code) {
          const translations = item?._translations;
          if (translations && translations[originalLanguage]) {
            originalTitle = translations[originalLanguage]!.title;
          }
        }
      }
      // @ts-ignore: must
      item._original_title = originalTitle;

      //= item.content_text.replace(/\n/g, "&lt;br&gt;");
      return item;
    });

    // build feed.xml
    // @ts-ignore: npm module
    const feedOutput = jsonfeedToAtom(feedJson, {
      language: feedJson.language,
    });
    // const rssOutput = "";
    // write to dist file
    const rssPath = getDistFilePath(
      indexSubDomain,
      `${language.prefix}feed.xml`,
    );
    await writeTextFile(rssPath, feedOutput);

    const indexPath = getDistFilePath(
      indexSubDomain,
      `${language.prefix}index.html`,
    );
    const indexHTML = feedToHTML(
      feedJson,
      config,
      indexTemplateString,
      config.languages,
      config.versions.slice(0, 1),
    );
    await writeTextFile(indexPath, indexHTML);

    // latest item date_modified is greater Monday
    // we will run archive task, try to archive all items of their week
  }
  // copy static assets
  await copyStaticAssets(indexSubDomain);

  // build stats
  const sitesMap = config.sites;
  const sourcesMap = new Map<string, Source>();
  const apiMap = new Map<string, API>();
  for (const source of config.sources) {
    sourcesMap.set(source.id, source);
    const api = Array.isArray(source.api) ? source.api : [source.api];
    for (const apiItem of api) {
      apiMap.set(apiItem.name, {
        ...apiItem,
        rules: source.rules || [],
      });
    }
  }
  const targetSiteIdentifiersMap = new Map<string, string[]>();
  const siteApiMap = new Map<string, string[]>();
  for (const siteIdentifier of siteIdentifiers) {
    const siteConfig = sitesMap[siteIdentifier];
    const siteIsOnlyDev = siteConfig.dev && !isDev();
    const siteTags = siteConfig.tags || [];
    const siteSources: Source[] = [];
    siteApiMap.set(siteIdentifier, []);
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
          const apis = Array.isArray(source.api) ? source.api : [source.api];
          for (const api of apis) {
            if (!siteApiMap.get(siteIdentifier)!.includes(api.name)) {
              siteApiMap.get(siteIdentifier)!.push(api.name);
            }
          }
        }
      }
    }
  }

  const recentlySourcesPath = getRecentlySourcesStatPath();
  let recentlyGroups: SourceStatGroup[] = [];
  try {
    const recentlySourcesContent = await readJSONFile(recentlySourcesPath);
    recentlyGroups = recentlySourcesContent as SourceStatGroup[];
  } catch (_e) {
    // ignore
  }

  const recentlyStats: SiteStatInfo[] = [];
  const allSiteStats: Record<string, Record<string, Record<string, number>>> =
    {};

  const timeline: string[] = [];
  for (const group of recentlyGroups) {
    const time = group.t;
    timeline.push(time);
    const sources = group.s;

    const sourceKeys = Object.keys(sources);
    for (const sourceKey of sourceKeys) {
      const siteIdentifiers = targetSiteIdentifiersMap.get(sourceKey);
      if (siteIdentifiers) {
        for (const siteIdentifier of siteIdentifiers) {
          if (!allSiteStats[siteIdentifier]) {
            allSiteStats[siteIdentifier] = {};
          }

          const apiKeys = Object.keys(sources[sourceKey]);
          for (const apiKey of apiKeys) {
            const statItem = sources[sourceKey][apiKey];
            if (!allSiteStats[siteIdentifier][apiKey]) {
              allSiteStats[siteIdentifier][apiKey] = {};
            }
            allSiteStats[siteIdentifier][apiKey][time] = statItem.count;
          }
        }
      }
    }
  }
  // sort timeline
  timeline.sort((a, b) => {
    return new Date(a).getTime() - new Date(b).getTime();
  });
  for (const siteIdentifier of siteIdentifiers) {
    const siteConfig = sitesMap[siteIdentifier];
    const siteStat: SiteStatInfo = {
      site_identifier: siteIdentifier,
      site_title: siteConfig.translations!["zh-Hans"].title,
      daily_count: 0,
      data: "[]",
      apis: [],
    };
    const statData: (string | number)[][] = [[
      "x",
      ...timeline,
    ]];
    const siteApis = siteApiMap.get(siteIdentifier) || [];
    let index = 1;
    for (const apiName of siteApis) {
      statData[index] = [apiName];

      const api: API = apiMap.get(apiName)!;
      const apiInfo: APIInfo = {
        ...api,
        count: 0,
      };
      siteStat.apis.push(apiInfo);

      for (const point of timeline) {
        if (!allSiteStats[siteIdentifier]) {
          allSiteStats[siteIdentifier] = {};
        }
        if (!allSiteStats[siteIdentifier][apiName]) {
          allSiteStats[siteIdentifier][apiName] = {};
        }
        const count = allSiteStats[siteIdentifier][apiName][point] || 0;
        const time = new Date(point).getTime();
        // if in 24hours
        if (now.getTime() - time < 24 * 60 * 60 * 1000) {
          siteStat.daily_count += count;
        }
        statData[index].push(count);
      }
      index++;
    }
    siteStat.data = JSON.stringify(statData, null, 2);
    recentlyStats.push(siteStat);
  }

  // @ts-ignore: add meta
  // buils stats
  const statsData = {
    sites: recentlyStats,
    build_time: now.toISOString(),
  };
  // @ts-ignore: add meta
  const statsHtml = mustache.render(statsTemplateString, statsData);
  const indexPath = getDistFilePath(
    indexSubDomain,
    `stats/index.html`,
  );
  await writeTextFile(indexPath, statsHtml);

  // build yearly stats
  // read dir
  const statsPath = getDataStatsDirPath();
  const yearlyStats: string[] = [];
  for await (const yearlyEntry of Deno.readDir(statsPath)) {
    if (yearlyEntry.isFile && yearlyEntry.name.endsWith(".json")) {
      const statYear = yearlyEntry.name.replace(".json", "");
      if (/^\d{4}$/.test(statYear)) {
        const statYearPath = path.join(statsPath, yearlyEntry.name);
        const statYearContent = await readJSONFile(statYearPath) as Stat;
      }
    }
  }
}
