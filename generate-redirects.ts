import issueMap from "./migrations/issue-map.json" assert { type: "json" };
import { Config } from "./interface.ts";
import { TARGET_SITE_LANGUAEGS } from "./constant.ts";
import log from "./log.ts";
import { getDistFilePath, writeTextFile } from "./util.ts";
export default async function generateRedirects(
  siteIdentifier: string,
  config: Config,
) {
  const siteConfig = config.sites[siteIdentifier];
  const rootDomain = config.root_domain;
  const archiveDomain = config.archive.siteIdentifier;
  let redirects = ``;
  if (siteConfig.redirect !== true) {
    log.info(`skip generate redirects for ${siteIdentifier}`);
    return;
  }
  for (const language of TARGET_SITE_LANGUAEGS) {
    const targetPrefix =
      `https://${archiveDomain}.${rootDomain}/${language.prefix}${siteIdentifier}`;

    // generate tags
    redirects += `/${language.prefix}tags/* ${targetPrefix}/tags/:splat 302\n`;

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
            `/${language.prefix}issues/${issueKey}/ ${targetPrefix}/issues/${newIssue}/\n`;
        }
      }
    }
  }
  // trim last new line
  if (redirects.endsWith(`\n`)) {
    redirects = redirects.slice(0, -1);
  }
  // console.log("redirects", redirects);
  await writeTextFile(getDistFilePath(siteIdentifier, "_redirects"), redirects);
}
