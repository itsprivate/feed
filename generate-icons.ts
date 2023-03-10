import { resize } from "./bad-deps.ts";
import { getDistFilePath } from "./util.ts";
export default async function generateIcons(siteIdentifier: string) {
  const icon = await Deno.readFile(
    `./assets/icon.png`,
  );
  // copy icon to dist
  // await Deno.writeFile(getDistFilePath(siteIdentifier, "icon.png"), icon);
  // generate apple-touch-icon
  const appleTouchIcon = await resize(icon, {
    width: 150,
    height: 150,
  });

  await Deno.writeFile(
    getDistFilePath(siteIdentifier, "apple-touch-icon.png"),
    appleTouchIcon,
  );
  await Deno.writeFile(
    getDistFilePath(siteIdentifier, "icon.png"),
    appleTouchIcon,
  );
  const favicon32 = await resize(icon, {
    width: 32,
    height: 32,
  });
  // write to file

  await Deno.writeFile(
    getDistFilePath(siteIdentifier, "favicon.ico"),
    favicon32,
  );
}
