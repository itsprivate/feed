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

  for (const siteIdentifier of siteIdentifiers) {
    const p = Deno.run({
      cmd: ["make", "publish", "name=" + siteIdentifier],
    });
    const status = await p.status();
    log.info("publish status: ", status);
  }
}

if (import.meta.main) {
  await publishToPages();
}
