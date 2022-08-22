import { dotenvConfig, flags } from "./deps.ts";

import log from "./log.ts";
import {
  getFeedSiteIdentifiers,
  getGenConfig,
  isDebug,
  isDev,
  writeTextFile,
} from "./util.ts";
import decompressCurrentData from "./workflows/0-decompress-current.ts";
import fetchSources from "./workflows/1-fetch-sources.ts";
import formatItems from "./workflows/2-format-items.ts";
import translateItems from "./workflows/3-translate-items.ts";
import buildCurrent from "./workflows/4-build-current.ts";
import archive from "./workflows/5-archive.ts";
import buildSite from "./workflows/6-build-site.ts";
import serveSite from "./workflows/7-serve-site.ts";
import compressCurrent from "./workflows/8-compress-current.ts";
// import uploadCurrent from "./workflows/9-upload-current.ts";
import uploadArchive from "./workflows/10-upload-archive.ts";
import uploadPublic from "./workflows/11-upload-public-to-r2.ts";
import { RunOptions, Task } from "./interface.ts";
import buildConfig from "./build-config.ts";
export default async function main() {
  await dotenvConfig({
    export: true,
  });
  await buildConfig();

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
    stage.unshift("decompress_current");
    // stage.push("upload_archive");
    stage.push("compress_current");
  }
  if (isDebug()) {
    log.setLevel("debug");
  }

  let sites: string[] | undefined;
  const args = flags.parse(Deno.args);
  if (args.stage) {
    stage = (args.stage).split(",");
  }
  if (args["extra-stage"]) {
    const extraStages = (args["extra-stage"]).split(",");
    stage = stage.concat(extraStages);
  }
  if (args.site) {
    sites = args.site.split(",");
  }
  const config = await getGenConfig();
  const sitesMap = config.sites;
  let siteIdentifiers = Object.keys(config.sites);
  if (sites && Array.isArray(sites)) {
    siteIdentifiers = siteIdentifiers.filter((siteIdentifier) => {
      return (sites as string[]).includes(siteIdentifier);
    });
  }
  log.info("start build ", siteIdentifiers);
  const runOptions: RunOptions = { siteIdentifiers: siteIdentifiers, config };
  let allPostTasks: Task[] = [];
  // 0. decompress current data from zip
  if (stage.includes("decompress_current")) {
    await decompressCurrentData(runOptions);
  } else {
    log.info("skip decompress current data from zip stage");
  }

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

  // 5. archive items
  if (stage.includes("archive")) {
    log.info(`start archive items`);
    await archive(runOptions);
  } else {
    log.info("skip archive stage");
  }

  // 6. build site
  if (stage.includes("build_site")) {
    log.info(`start build site`);
    await buildSite(runOptions);
  } else {
    log.info("skip build_site stage");
  }

  if (allPostTasks.length > 0) {
    for (const task of allPostTasks) {
      if (task.type === "write") {
        await writeTextFile(task.meta.path, task.meta.content);
      }
    }
    log.info(`run ${allPostTasks.length} post tasks success`);
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
      serveSite(siteIdentifier, siteConfig.port || 8000);
    }
  } else {
    log.info("skip serve_site stage");
  }

  // 8. zip current data
  if (stage.includes("compress_current")) {
    await compressCurrent(runOptions);
  } else {
    log.info("skip compress_current stage");
  }

  // 9. upload current data to s3
  // if (stage.includes("upload_current")) {
  //   await uploadCurrent(runOptions);
  // } else {
  //   log.info("skip upload_current stage");
  // }

  // 10. upload archive data to s3
  if (stage.includes("upload_archive")) {
    await uploadArchive(runOptions);
  } else {
    log.info("skip upload_archive stage");
  }

  // 11. upload public data to r2
  if (stage.includes("upload_public")) {
    await uploadPublic(runOptions);
  } else {
    log.info("skip upload_public stage");
  }
}

if (import.meta.main) {
  main();
}
