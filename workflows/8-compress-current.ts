import { getDataPath } from "../util.ts";
import { RunOptions } from "../interface.ts";
import log from "../log.ts";
import { compress } from "../bad-deps.ts";
export default async function compressCurrentData(_options: RunOptions) {
  const zipName = getDataPath() + ".zip";
  await compress(getDataPath(), zipName, {
    overwrite: true,
  });
  const stat = await Deno.stat(zipName);
  log.info(
    `finish zip current data to ${getDataPath() + ".zip"}, size: ${
      (stat.size / 1000000).toFixed(2)
    } MB`,
  );
}
