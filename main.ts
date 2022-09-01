import { dotenvConfig, flags } from "./deps.ts";

import log from "./log.ts";
import {
  getChangedSitePaths,
  getGenConfig,
  isDebug,
  isDev,
  writeTextFile,
} from "./util.ts";
import fetchSources from "./workflows/1-fetch-sources.ts";
import formatItems from "./workflows/2-format-items.ts";
import translateItems from "./workflows/3-translate-items.ts";
import buildCurrent from "./workflows/4-build-current.ts";
// import archive from "./workflows/5-archive.ts";
import buildSite from "./workflows/6-build-site.ts";
import buildIndexSite from "./workflows/7_0-build-index-site.ts";
import serveSite from "./workflows/7-serve-site.ts";
import { RunOptions, Task } from "./interface.ts";
import buildConfig from "./build-config.ts";
export default async function main() {
  await dotenvConfig({
    export: true,
  });
  await buildConfig();
  const args = flags.parse(Deno.args);

  let stage: string[] = [];

  if (args.source) {
    // only source
    stage = stage.concat([
      "fetch",
      "format",
      "translate",
      "build_current",
      // "archive",
    ]);
  } else if (args.build) {
    // only build stage
    stage = stage.concat([
      "build_site",
      "build_index_site",
    ]);
  } else if (args.serve) {
    // only build stage
    stage = stage.concat([
      "build_site",
      "build_index_site",
      "serve_site",
    ]);
  } else {
    stage = stage.concat([
      "fetch",
      "format",
      "translate",
      "build_current",
      "archive",
      "build_site",
      "build_index_site",
    ]);
    if (isDev()) {
      stage.push("serve_site");
    }
  }

  if (isDebug()) {
    log.setLevel("debug");
  }

  let sites: string[] | undefined;
  if (args.stage) {
    stage = (args.stage).split(",");
  }
  if (args["extra-stage"]) {
    const extraStages = (args["extra-stage"]).split(",");
    stage = stage.concat(extraStages);
  }
  if (args.site) {
    sites = args.site.split(",");
  } else if (Deno.env.get("SITE")) {
    sites = Deno.env.get("SITE")?.split(",");
  }
  const config = await getGenConfig();
  const sitesMap = config.sites;
  let siteIdentifiers = Object.keys(config.sites);
  if (sites && Array.isArray(sites)) {
    siteIdentifiers = siteIdentifiers.filter((siteIdentifier) => {
      return (sites as string[]).includes(siteIdentifier);
    });
  }
  // filter
  siteIdentifiers = siteIdentifiers.filter((siteIdentifier) => {
    return !sitesMap[siteIdentifier].standalone;
  });
  log.info("sites: ", siteIdentifiers, "with stage:", stage);

  const runOptions: RunOptions = { siteIdentifiers: siteIdentifiers, config };
  let allPostTasks: Task[] = [];
  try {
    // 1. fetch sources
    if (stage.includes("fetch")) {
      const { postTasks } = await fetchSources(runOptions);
      if (postTasks && Array.isArray(postTasks) && postTasks.length > 0) {
        allPostTasks = allPostTasks.concat(postTasks);
      }
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

    // // 5. archive items
    // if (stage.includes("archive")) {
    //   log.info(`start archive items`);
    //   await archive(runOptions);
    // } else {
    //   log.info("skip archive stage");
    // }

    // 6. build site
    if (stage.includes("build_site")) {
      log.info(`start build site`);
      await buildSite(runOptions);
    } else {
      log.info("skip build_site stage");
    }
  } catch (e) {
    throw e;
  } finally {
    // must run post tasks
    if (allPostTasks.length > 0) {
      for (const task of allPostTasks) {
        if (task.type === "write") {
          await writeTextFile(task.meta.path, task.meta.content);
        }
      }
      log.info(`run ${allPostTasks.length} post tasks success`);
    }
  }

  // build index

  if (stage.includes("build_index_site")) {
    log.info(`start build index site`);
    await buildIndexSite(runOptions);
  } else {
    log.info("skip build_index_site stage");
  }

  // 7. serve site
  if (
    stage.includes("serve_site") &&
    Array.isArray(siteIdentifiers) &&
    siteIdentifiers.length > 0
  ) {
    for (const siteIdentifier of siteIdentifiers) {
      const siteConfig = sitesMap[siteIdentifier];
      serveSite(siteIdentifier, siteConfig.port || 8000);
    }

    if (stage.includes("build_index_site")) {
      serveSite("www", config.sites.www.port || 9001);
    }
  } else {
    log.info("skip serve_site stage");
  }
}

if (import.meta.main) {
  main();
}
