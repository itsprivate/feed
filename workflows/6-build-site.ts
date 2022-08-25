import { jsonfeedToAtom, jsonfeedToRSS, path } from "../deps.ts";
import { ItemsJson, RunOptions } from "../interface.ts";
import itemsToFeed from "../items-to-feed.ts";
import {
  getCurrentItemsFilePath,
  getDataCurrentItemsPath,
  getDistFilePath,
  getDistPath,
  pathToSiteIdentifier,
  readJSONFile,
  siteIdentifierToPath,
  writeJSONFile,
  writeTextFile,
} from "../util.ts";
import generateIcons from "../generate-icons.ts";
import log from "../log.ts";
import { TARGET_SITE_LANGUAEGS } from "../constant.ts";
import feedToHTML from "../feed-to-html.ts";
import generateRedirects from "../generate-redirects.ts";
export default async function buildSite(options: RunOptions) {
  const config = options.config;
  const currentDataPath = getDataCurrentItemsPath();
  let siteIdentifiers: string[] = [];
  const indexTemplateString = await Deno.readTextFile(
    "./templates/index.html",
  );
  for await (const dirEntry of Deno.readDir(currentDataPath)) {
    if (dirEntry.isDirectory && !dirEntry.name.startsWith(".")) {
      siteIdentifiers.push(pathToSiteIdentifier(dirEntry.name));
    }
  }
  const sites = options.siteIdentifiers;
  if (sites && Array.isArray(sites)) {
    siteIdentifiers = siteIdentifiers.filter((siteIdentifier) => {
      return (sites as string[]).includes(siteIdentifier);
    });
  }
  // clear dist folder
  try {
    await Deno.remove(getDistPath(), { recursive: true });
  } catch (_e) {
    // ignore
  }
  for (const siteIdentifier of siteIdentifiers) {
    const currentItemsFilePath = getCurrentItemsFilePath(
      siteIdentifier,
    );
    const itemsRelativePath = path.relative(
      `${getDataCurrentItemsPath()}/${siteIdentifierToPath(siteIdentifier)}`,
      currentItemsFilePath,
    );
    let currentItemsJson: ItemsJson = { items: {} };
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
        const feedJson = itemsToFeed(
          itemsRelativePath,
          currentItemsJson,
          siteIdentifier,
          language.code,
          config,
        );
        // write to dist file
        const feedPath = getDistFilePath(
          siteIdentifier,
          `${language.prefix}feed.json`,
        );
        await writeJSONFile(feedPath, feedJson);

        // build atom.xml
        // no need
        // @ts-ignore: npm module
        // const atomOutput = jsonfeedToAtom(feedJson);
        // write to dist file
        // const atomPath = getDistFilePath(
        //   siteIdentifier,
        //   `${language.prefix}atom.xml`,
        // );
        // await writeTextFile(atomPath, atomOutput);

        // build feed.xml
        // @ts-ignore: npm module
        const rssOutput = jsonfeedToRSS(feedJson, {
          language: feedJson.language,
        });
        // const rssOutput = "";
        // write to dist file
        const rssPath = getDistFilePath(
          siteIdentifier,
          `${language.prefix}feed.xml`,
        );
        await writeTextFile(rssPath, rssOutput);

        const indexPath = getDistFilePath(
          siteIdentifier,
          `${language.prefix}index.html`,
        );
        const indexHTML = await feedToHTML(
          feedJson,
          config,
          indexTemplateString,
        );
        await writeTextFile(indexPath, indexHTML);

        // copy static files
        try {
          await generateIcons(siteIdentifier);
        } catch (e) {
          log.error("can not generate icons for ", siteIdentifier);
          throw e;
        }
      }
      log.info(`${siteIdentifier} build success`);
    } else {
      log.info(
        `skip build ${siteIdentifier}, cause no items to be build`,
      );
    }

    // generate redirects for old sites
    await generateRedirects(siteIdentifier, config);

    // latest item date_modified is greater Monday
    // we will run archive task, try to archive all items of their week
  }
}
