import { fs } from "../deps.ts";
import {
  getChangedSitePaths,
  getDistPath,
  pathToSiteIdentifier,
  readJSONFile,
} from "../util.ts";
import log from "../log.ts";
import { indexSubDomain } from "../constant.ts";
export default async function publishToPages() {
  // walk dist folder
  await fs.ensureDir(getDistPath());
  // ensure folder exists
  let changedSites: string[] | undefined;
  let siteIdentifiers: string[] = [];
  try {
    const changedSitesPath = getChangedSitePaths();
    changedSites = await readJSONFile(changedSitesPath);
  } catch (e) {
    log.debug(`read changedSitesPath json file error:`, e);
  }
  if (changedSites) {
    log.info(`got changed sites: ${changedSites}`);
    siteIdentifiers = changedSites.concat(indexSubDomain);
  } else {
    log.info(`no changed sites file, scan all sites`);

    for await (const dirEntry of Deno.readDir(getDistPath())) {
      if (dirEntry.isDirectory && !dirEntry.name.startsWith(".")) {
        // only build changed folder

        siteIdentifiers.push(pathToSiteIdentifier(dirEntry.name));
      }
    }
  }
  // resort site
  siteIdentifiers = siteIdentifiers.sort((a, b) => {
    if (a === indexSubDomain) {
      return 1;
    }
    if (b === indexSubDomain) {
      return -1;
    }
    return a.localeCompare(b);
  });
  log.info("to be published sites:", siteIdentifiers);
  let index = 1;

  for (const siteIdentifier of siteIdentifiers) {
    log.info(
      `${index}/${siteIdentifiers.length}`,
      "publishing",
      "site",
      siteIdentifier,
    );

    const p = Deno.run({
      cmd: ["make", "prod-publish", "site=" + siteIdentifier],
    });
    const status = await p.status();
    log.info("publish status: ", status);
    index++;
  }
}

if (import.meta.main) {
  await publishToPages();
}
