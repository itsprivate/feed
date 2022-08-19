import { flags } from "./deps.ts";

import log from "./log.ts";
import { getConfig, getFeedSiteIdentifiers, isDebug, isDev } from "./util.ts";

import fetchSources from "./workflows/1-fetch-sources.ts";
import formatItems from "./workflows/2-format-items.ts";
import translateItems from "./workflows/3-translate-items.ts";
import buildCurrent from "./workflows/4-build-current.ts";
import archive from "./workflows/5-archive.ts";
import buildSite from "./workflows/6-build-site.ts";
import serveSite from "./workflows/7-serve-site.ts";
import serveArchiveSite from "./workflows/8-serve-archive-site.ts";
import deployToR2 from "./workflows/9-deploy-to-r2.ts";
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
  } else {
    stage.push("deploy");
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
  let siteIdentifiers = getFeedSiteIdentifiers(config);
  if (sites && Array.isArray(sites)) {
    siteIdentifiers = siteIdentifiers.filter((siteIdentifier) => {
      return (sites as string[]).includes(siteIdentifier);
    });
  }
  log.info("start build ", siteIdentifiers);
  const runOptions: RunOptions = { siteIdentifiers: siteIdentifiers, config };

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
    isServer && stage.includes("serve_site") &&
    Array.isArray(siteIdentifiers) &&
    siteIdentifiers.length > 0
  ) {
    for (const siteIdentifier of siteIdentifiers) {
      const siteConfig = sitesMap[siteIdentifier];
      serveSite(siteIdentifier, siteConfig.port);
    }
    // serve archive
    serveArchiveSite();
  } else {
    log.info("skip serve_site stage");
  }

  // 9. deploy to r2
  if (stage.includes("deploy")) {
    await deployToR2(runOptions);
  }
}

if (import.meta.main) {
  main();
}
