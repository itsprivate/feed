import { fs } from "../deps.ts";
import { getDistPath, pathToSiteIdentifier } from "../util.ts";
import log from "../log.ts";
export default async function publishToPages() {
  // walk dist folder
  await fs.ensureDir(getDistPath());
  // ensure folder exists
  const siteIdentifiers: string[] = [];
  for await (const dirEntry of Deno.readDir(getDistPath())) {
    if (dirEntry.isDirectory && !dirEntry.name.startsWith(".")) {
      siteIdentifiers.push(pathToSiteIdentifier(dirEntry.name));
    }
  }
  let index = 1;
  for (const siteIdentifier of siteIdentifiers) {
    log.info(
      `${index}/${siteIdentifiers.length}`,
      "publishing",
      "site",
      siteIdentifier,
    );
    const p = Deno.run({
      cmd: ["make", "publish", "site=" + siteIdentifier],
    });
    const status = await p.status();
    log.info("publish status: ", status);
    index++;
  }
}

if (import.meta.main) {
  await publishToPages();
}
