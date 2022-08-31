import compressCache from "./compress-cache.ts";
import { fs } from "../deps.ts";
import { getDataPath } from "../util.ts";
export async function initCurrentZip() {
  // create  empty folder for current data
  await fs.emptyDir(getDataPath());
  await compressCache();
  // then upload
}

if (import.meta.main) {
  await initCurrentZip();
}
