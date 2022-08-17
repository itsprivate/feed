import { jsonfeedToAtom, jsonfeedToRSS, mustache, slug } from "../deps.ts";
import { FormatedItem, RunOptions } from "../interface.ts";
import itemsToFeed from "../items-to-feed.ts";
import {
  generateIcons,
  getCurrentItemsFilePath,
  getDataCurrentItemsPath,
  getDistFilePath,
  pathToDomain,
  readJSONFile,
  writeJSONFile,
  writeTextFile,
} from "../util.ts";
import log from "../log.ts";
import { TARGET_SITE_LANGUAEGS } from "../constant.ts";
import feedToHTML from "../feed-to-html.ts";

export default async function buildSite(options: RunOptions) {
  const config = options.config;
  const currentDataPath = getDataCurrentItemsPath();
  let domains: string[] = [];

  for await (const dirEntry of Deno.readDir(currentDataPath)) {
    if (dirEntry.isDirectory && !dirEntry.name.startsWith(".")) {
      domains.push(pathToDomain(dirEntry.name));
    }
  }
  const sites = options.domains;
  if (sites && Array.isArray(sites)) {
    domains = domains.filter((domain) => {
      return (sites as string[]).includes(domain);
    });
  }
  for (const domain of domains) {
    const currentItemsFilePath = getCurrentItemsFilePath(
      domain,
    );
    let currentItemsJson: Record<
      string,
      FormatedItem
    > = {};
    try {
      currentItemsJson = await readJSONFile(
        currentItemsFilePath,
      );
    } catch (_e) {
      // ignore
    }

    //check if need to archive items
    const currentItemsJsonKeys = Object.keys(
      currentItemsJson,
    );

    if (currentItemsJsonKeys.length > 0) {
      // multiple languages support
      const languages = TARGET_SITE_LANGUAEGS;
      for (const language of languages) {
        const feedJson = await itemsToFeed(
          currentItemsJson,
          domain,
          language.code,
          config,
        );
        // write to dist file
        const feedPath = getDistFilePath(domain, `${language.prefix}feed.json`);
        await writeJSONFile(feedPath, feedJson);

        // build atom.xml
        // @ts-ignore: npm module
        const atomOutput = jsonfeedToAtom(feedJson);
        // write to dist file
        const atomPath = getDistFilePath(domain, `${language.prefix}atom.xml`);
        await writeTextFile(atomPath, atomOutput);

        // build rss.xml
        // @ts-ignore: npm module
        const rssOutput = jsonfeedToRSS(feedJson);
        // write to dist file
        const rssPath = getDistFilePath(domain, `${language.prefix}rss.xml`);
        await writeTextFile(rssPath, rssOutput);

        const indexPath = getDistFilePath(
          domain,
          `${language.prefix}index.html`,
        );
        const indexHTML = await feedToHTML(feedJson, config);
        await writeTextFile(indexPath, indexHTML);

        // copy static files
        try {
          await generateIcons(domain);
        } catch (e) {
          log.error("can not generate icons for ", domain);
          throw e;
        }
      }
      log.info(`${domain} build success`);
    } else {
      log.info(
        `skip build ${domain}, cause no items to be build`,
      );
    }
    // latest item date_modified is greater Monday
    // we will run archive task, try to archive all items of their week
  }
}
