import { groupBy, jsonfeedToAtom, mustache, path } from "../deps.ts";
import { FeedItem, Feedjson, RunOptions } from "../interface.ts";
import {
  formatHumanTime,
  getCurrentTranslations,
  getDataCurrentItemsPath,
  getDistFilePath,
  getDistPath,
  getSourceLinks,
  isDev,
  pathToSiteIdentifier,
  readJSONFile,
  resortSites,
  siteIdentifierToDomain,
  siteIdentifierToUrl,
  writeJSONFile,
  writeTextFile,
} from "../util.ts";
import generateIcons from "../generate-icons.ts";
import log from "../log.ts";
import feedToHTML from "../feed-to-html.ts";
import { indexSubDomain } from "../constant.ts";
import copyStaticAssets from "../copy-static-assets.ts";
export default async function buildSite(options: RunOptions) {
  const config = options.config;
  const indexConfig = config.sites[indexSubDomain];
  const currentDataPath = getDataCurrentItemsPath();
  let siteIdentifiers: string[] = [];
  const indexTemplateString = await Deno.readTextFile(
    "./templates/root-index.html.mu",
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
    const version = config.versions[1];
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
      "icon": config.icon,
      "favicon": config.favicon,
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
      const takedItems = groups[siteIdentifier].slice(0, takedCount);
      const remainingCount = groups[siteIdentifier].length - takedCount;
      feedJson.items = feedJson.items.concat(takedItems);
      return {
        "title": currentTranslations.title,
        "hostname": siteIdentifierToDomain(siteIdentifier),
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
          pathname + version.prefix,
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
    const indexHTML = await feedToHTML(
      feedJson,
      config,
      indexTemplateString,
      config.languages,
      config.versions.slice(0, 1),
    );
    await writeTextFile(indexPath, indexHTML);

    // copy static files
    try {
      await generateIcons(indexSubDomain);
    } catch (e) {
      log.error("can not generate icons for ", indexSubDomain);
      throw e;
    }

    // latest item date_modified is greater Monday
    // we will run archive task, try to archive all items of their week
  }
  // copy static assets
  await copyStaticAssets(indexSubDomain);
}
