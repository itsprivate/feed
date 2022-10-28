import {
  getConfig,
  getDataPath,
  getDataStatsPath,
  getRecentlySiteStatPath,
  getRecentlySourcesStatPath,
  readJSONFile,
  writeJSONFile,
} from "../util.ts";
import { groupBy, path } from "../deps.ts";
import { SourceAPIConfig } from "../interface.ts";
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
  const recentlySourcesStatPath = path.join(getDataPath(), "stats.json");
  const recentlySourcesStat = await readJSONFile(recentlySourcesStatPath);

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
  const sources = recentlySourcesStat[2022].sources;
  const keys = Object.keys(sources);
  const finalSources = {
    "10": {},
  };
  for (const key of keys) {
    const source = sources[key];
    if (!finalSources["10"][source.id]) {
      finalSources["10"][source.id] = {};
    }
    const sourceApiConfig = configSourceApis[source.id + "__" + source.url];
    if (!finalSources["10"][source.id][sourceApiConfig.name]) {
      finalSources["10"][source.id][sourceApiConfig.name] = {};
    }
    finalSources["10"][source.id][sourceApiConfig.name] = {
      checked_at: source.checked_at,
      count: source.final_count,
    };
  }
  // console.log("finalSources", finalSources);
  await writeJSONFile(
    path.join(getDataPath(), "stats", "2022.json"),
    finalSources,
  );
}

if (import.meta.main) {
  await fix();
}
