import { fs } from "../deps.ts";
import {
  getDataRawPath,
  identifierToCachedKey,
  parseItemIdentifierWithTime,
} from "../util.ts";
import log from "../log.ts";
async function main() {
  const currentRawKeysMap = new Map<string, string[]>();

  // also get current raw keys
  await fs.ensureDir(getDataRawPath());
  for await (
    const entry of fs.walk(getDataRawPath())
  ) {
    if (entry.isFile && entry.name.endsWith(".json")) {
      const key = entry.name.replace(/\.json$/, "");
      const itemKey = identifierToCachedKey(key);
      if (!currentRawKeysMap.has(itemKey)) {
        currentRawKeysMap.set(itemKey, []);
      }

      currentRawKeysMap.get(itemKey)?.push(entry.path);
    }
  }

  for (const [key, paths] of currentRawKeysMap) {
    // console.log("paths", paths);
    if (paths.length > 1) {
      // console.log(key, paths);
      // sort by time, delete the oldest
      const sortedPaths = paths.sort((a, b) => {
        const aParsed = parseItemIdentifierWithTime(a);
        const bParsed = parseItemIdentifierWithTime(b);
        const aTime = new Date(
          Date.UTC(
            Number(aParsed.year),
            Number(aParsed.month) - 1,
            Number(aParsed.day),
            Number(aParsed.hour),
            Number(aParsed.minute),
            Number(aParsed.second),
            Number(aParsed.millisecond),
          ),
        ).getTime();
        const bTime = new Date(
          Date.UTC(
            Number(bParsed.year),
            Number(bParsed.month) - 1,
            Number(bParsed.day),
            Number(bParsed.hour),
            Number(bParsed.minute),
            Number(bParsed.second),
            Number(bParsed.millisecond),
          ),
        ).getTime();
        return bTime - aTime;
      });
      // delete the oldest
      for (let i = 1; i < sortedPaths.length; i++) {
        await Deno.remove(sortedPaths[i]);
        log.info(`remove duplicated raw file: ${sortedPaths[i]}`);
      }
    }
  }
}

if (import.meta.main) {
  main();
}
