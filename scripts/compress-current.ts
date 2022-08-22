import { getDataPath } from "../util.ts";
import { RunOptions } from "../interface.ts";
import log from "../log.ts";
import { compress } from "../bad-deps.ts";
import { path } from "../deps.ts";
export default async function compressCurrentData() {
  const zipName = getDataPath() + ".zip";
  // remove all empty dir getDataPath() recursively
  await removeEmptyDirectories(getDataPath());
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

async function removeEmptyDirectories(directory: string) {
  // lstat does not follow symlinks (in contrast to stat)
  const fileStats = await Deno.lstat(directory);
  if (!fileStats.isDirectory) {
    return;
  }
  let fileNames = await Deno.readDirSync(directory);
  let isEmpty = true;
  for await (const _ of fileNames) {
    isEmpty = false;
    break;
  }

  if (!isEmpty) {
    fileNames = await Deno.readDirSync(directory);
    const recursiveRemovalPromises = [];
    for (const fileName of fileNames) {
      recursiveRemovalPromises.push(
        removeEmptyDirectories(path.join(directory, fileName.name)),
      );
    }

    await Promise.all(recursiveRemovalPromises);

    // re-evaluate fileNames; after deleting subdirectory
    // we may have parent directory empty now
    fileNames = await Deno.readDirSync(directory);
  }

  let isRealEmpty = true;
  for await (const _ of fileNames) {
    isRealEmpty = false;
    break;
  }

  if (isRealEmpty) {
    console.log("Removing empty folder: ", directory);
    await Deno.remove(directory);
  }
}

if (import.meta.main) {
  await compressCurrentData();
}
