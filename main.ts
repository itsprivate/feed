import { flags } from "./deps.ts";

import log from "./log.ts";
import { getConfig, isDebug, isDev } from "./util.ts";

import fetchSources from "./workflows/1-fetch-sources.ts";
import formatItems from "./workflows/2-format-items.ts";
import translateItems from "./workflows/3-translate-items.ts";
import buildCurrent from "./workflows/4-build-current.ts";
import archive from "./workflows/5-archive.ts";
import buildSite from "./workflows/6-build-site.ts";
import serveSite from "./workflows/7-serve-site.ts";
import { RunOptions } from "./interface.ts";
export default async function main() {
  let stage = [
    "fetch",
    "format",
    "translate",
    "build_current",
    "archive",
    "build_site",
  ];
  if (isDev()) {
    stage.push("serve_site");
  }
  if (isDebug()) {
    log.setLevel("debug");
  }

  let sites: string[] | undefined;
  const args = flags.parse(Deno.args);
  if (args.stage) {
    stage = (args.stage).split(",");
  }
  if (args.site) {
    sites = args.site.split(",");
  }
  const config = await getConfig();
  const sitesMap = config.sites;
  let domains = Object.keys(sitesMap);
  if (sites && Array.isArray(sites)) {
    domains = domains.filter((domain) => {
      return (sites as string[]).includes(domain);
    });
  }
  const runOptions: RunOptions = { domains: domains };

  // 1. fetch sources
  if (stage.includes("fetch")) {
    await fetchSources(runOptions);
  } else {
    log.info("skip fetch stage");
  }

  // 2. format sources
  if (stage.includes("format")) {
    await formatItems(runOptions);
  } else {
    log.info("skip format stage");
  }

  // 3. translate formated items
  if (stage.includes("translate")) {
    await translateItems(runOptions);
  } else {
    log.info("skip translate stage");
  }

  // 4. build_items
  if (stage.includes("build_current")) {
    await buildCurrent(runOptions);
  } else {
    log.info("skip build_current stage");
  }

  // 5. archive items
  if (stage.includes("archive")) {
    await archive(runOptions);
  } else {
    log.info("skip archive stage");
  }

  // 6. build site
  if (stage.includes("build_site")) {
    await buildSite(runOptions);
  } else {
    log.info("skip build_site stage");
  }

  // 7. serve site
  const isServer = !(Deno.env.get("NO_SERVE") === "1");
  if (
    isServer && stage.includes("serve_site") && Array.isArray(domains) &&
    domains.length > 0
  ) {
    let port = 8000;
    for (const domain of domains) {
      serveSite(domain, port++);
    }
  } else {
    log.info("skip serve_site stage");
  }
}

if (import.meta.main) {
  main();
}
