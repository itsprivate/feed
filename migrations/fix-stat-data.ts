import {
  getConfig,
  getRecentlySiteStatPath,
  getRecentlySourcesStatPath,
  readJSONFile,
  writeJSONFile,
} from "../util.ts";
import { groupBy } from "../deps.ts";
export interface SourceStat {
  id: string;
  url: string;
  checked_at: string;
  raw_count: number;
  filtered_count: number;
  unique_count: number;
  final_count: number;
}

export interface NewSourceStat {
  raw_count: number;
  filtered_count: number;
  unique_count: number;
  final_count: number;
}
async function fix() {
  const recentlySourcesStatPath = getRecentlySourcesStatPath();
  const recentlySourcesStat = await readJSONFile(recentlySourcesStatPath);
  const finalRecentlySources = [];
  const groupByTime = groupBy(recentlySourcesStat, "checked_at");
  const groupKeys = Object.keys(groupByTime);
  const config = await getConfig();
  const configSources = config.sources;
  const configSourceApis: Record<string, SourceAPIConfig> = {};

  for (const source of configSources) {
    if (!Array.isArray(source.api)) {
      source.api = [source.api];
    }
    for (const api of source.api) {
      configSourceApis[source.id + "__" + api.url] = api;
    }
  }
  // sort
  groupKeys.sort((a, b) => {
    return new Date(b).getTime() - new Date(a).getTime();
  });
  for (const checkedAt of groupKeys) {
    const items = groupByTime[checkedAt];
    const finalRecentlySource = {};
    for (const source of items) {
      const sourceApiConfig = configSourceApis[source.id + "__" + source.url];
      if (!finalRecentlySource[source.id]) {
        finalRecentlySource[source.id] = {};
      }
      if (!finalRecentlySource[source.id][sourceApiConfig.name]) {
        finalRecentlySource[source.id][sourceApiConfig.name] = {};
      }
      finalRecentlySource[source.id][sourceApiConfig.name] = {
        raw_count: source.raw_count,
        filtered_count: source.filtered_count,
        unique_count: source.unique_count,
        count: source.final_count,
      };
    }
    finalRecentlySources.push({
      t: checkedAt,
      s: finalRecentlySource,
    });
  }
  await writeJSONFile(recentlySourcesStatPath, finalRecentlySources);
}

if (import.meta.main) {
  await fix();
}
