import issueMap from "./migrations/issue-map.json" assert { type: "json" };
import { Config } from "./interface.ts";
import { archiveSubDomain } from "./constant.ts";
import { getDistFilePath, writeTextFile } from "./util.ts";
export default async function generateRedirects(
  siteIdentifier: string,
  config: Config,
) {
  const rootDomain = config.root_domain;
  const archiveDomain = archiveSubDomain;
  let redirects = ``;
  // if (siteConfig.redirect !== true) {
  //   log.info(`skip generate redirects for ${siteIdentifier}`);
  //   return;
  // }
  redirects += `/rss.xml /feed.xml 302\n`;
  for (const language of config.languages.reverse()) {
    const targetPrefix =
      `https://${archiveDomain}.${rootDomain}/${language.prefix}${siteIdentifier}`;
    // generate issues

    const issueSitesKyes = Object.keys(issueMap);
    for (const issueSiteKey of issueSitesKyes) {
      if (issueSiteKey === siteIdentifier) {
        // @ts-ignore: json
        const issueMaps = issueMap[issueSiteKey];
        const issueKeys = Object.keys(issueMaps);
        for (const issueKey of issueKeys) {
          // @ts-ignore: json
          const newIssue = issueMaps[issueKey];
          redirects +=
            `/${language.prefix}issues/${issueKey}/ ${targetPrefix}/issues/${newIssue}/ 302\n`;
        }
      }
    }
  }

  for (const language of config.languages.reverse()) {
    const targetPrefix =
      `https://${archiveDomain}.${rootDomain}/${language.prefix}${siteIdentifier}`;

    // generate tags
    redirects += `/${language.prefix}tags/* ${targetPrefix}/tags/:splat 302\n`;
  }

  // generate rss.xml to feed.xml

  redirects += `/*/rss.xml /:splat/feed.xml 302\n`;
  // trim last new line
  if (redirects.endsWith(`\n`)) {
    redirects = redirects.slice(0, -1);
  }
  // log.debug("redirects", redirects);
  await writeTextFile(getDistFilePath(siteIdentifier, "_redirects"), redirects);
}
