import { getCachePath } from "../util.ts";
import log from "../log.ts";
import { decompress } from "../bad-deps.ts";
export default async function decompressCurrentCacheData() {
  const zipName = getCachePath() + ".zip";
  const stat = await Deno.stat(zipName);

  await decompress(zipName);
  // delete zip file
  await Deno.remove(zipName);
  log.info(
    `finish decompress current data, size: ${
      (stat.size / 1000000).toFixed(2)
    } MB`,
  );
}
if (import.meta.main) {
  await decompressCurrentCacheData();
}
