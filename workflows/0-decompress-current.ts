import { getDataPath } from "../util.ts";
import { RunOptions } from "../interface.ts";
import log from "../log.ts";
import { decompress } from "../bad-deps.ts";
export default async function compressCurrentData(_options: RunOptions) {
  const zipName = getDataPath() + ".zip";
  const stat = await Deno.stat(zipName);

  await decompress(zipName);
  log.info(
    `finish decompress current data, size: ${
      (stat.size / 1000000).toFixed(2)
    } MB`,
  );
}
