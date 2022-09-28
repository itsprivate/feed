import { resize } from "../bad-deps.ts";
import { fs, path } from "../deps.ts";
import { getConfig } from "../util.ts";
import log from "../log.ts";
export default async function generateIcons() {
  const config = await getConfig();

  for (const siteIdentifier of Object.keys(config.sites)) {
    if (siteIdentifier === "i" || siteIdentifier === "picks") {
      continue;
    }
    const source = `./assets-by-site-src/${siteIdentifier}/icon.png`;
    log.info(`generating icons for ${siteIdentifier} from ${source}`);
    const icon = await Deno.readFile(
      source,
    );
    await fs.ensureDir(path.join("assets-by-site", siteIdentifier));
    // copy icon to dist
    // await Deno.writeFile(getDistFilePath(siteIdentifier, "icon.png"), icon);
    // generate apple-touch-icon
    const appleTouchIcon = await resize(icon, {
      width: 180,
      height: 180,
    });
    await Deno.writeFile(
      path.join("assets-by-site", siteIdentifier, "icon.png"),
      appleTouchIcon,
      {
        create: true,
      },
    );
    const favicon32 = await resize(icon, {
      width: 32,
      height: 32,
    });
    // write to file

    await Deno.writeFile(
      path.join("assets-by-site", siteIdentifier, "favicon.ico"),
      favicon32,
      {
        create: true,
      },
    );
  }
}

if (import.meta.main) {
  generateIcons();
}
